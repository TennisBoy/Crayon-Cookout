# Crayon Cookout

Kids' crayon-design app. React SPA (Vite) + FastAPI + Supabase, deployed by
Docker Compose on a single VM behind a Cloudflare Tunnel.

**Monorepo**: the SPA lives in `frontend/`, the API in `backend/`. Run npm
commands from `frontend/`, python commands from `backend/`.

## Commands

```bash
cd frontend && npm install && npm run dev    # SPA on :5173
cd frontend && npm test                      # 177 tests
cd frontend && npm run build                 # production bundle
cd frontend && npm run lint                  # must exit 0
cd frontend && npm run typecheck             # tsc --noEmit
cd frontend && npm run verify                # all four, in order

cd backend && python -m venv .venv
cd backend && .venv/Scripts/pip install -r requirements-dev.txt  # .venv/bin on Linux
cd backend && .venv/Scripts/uvicorn app.main:app --reload   # API on :8000
cd backend && .venv/Scripts/python -m pytest  # 118 tests
cd backend && ruff check .                   # must pass

docker compose up -d --build                 # whole stack, LOCAL dev only
# Production runs deploy/docker-compose.prod.yml on the VM — see Deployment.
```

All gates — frontend tests, build, lint, backend tests — are expected to pass.
Treat any failure as a regression, not background noise.

## Deployment is LIVE — read this first

The app is in production at <https://crayoncookout.com> — an Oracle VM behind a
Cloudflare Tunnel, **with Stripe in live mode taking real payments**. Treat main
as shippable and a broken deploy as a customer-facing outage, not a dev problem.

`docs/SETUP.md` records how it was built and holds the progress box; keep it
current. Production runs `deploy/docker-compose.prod.yml` from
`/home/ubuntu/crayon`.

**The suites still fake the repositories**, so CI needs no secrets — a wrong
column name or an RLS policy that rejects the service role would not be caught
by a green build. Green tests are not evidence that a change works against the
real database.

**Never ask for, accept, or echo a secret in conversation.** Credentials belong
in `.env` on the VM. To check whether something is configured, ask for a
command that prints a boolean:
`curl -s localhost:8000/api/health/ready`.

## Workflow

- `/start-work` — branch, implement, verify, commit, push, open a PR
- `/complete-work` — review the PR, merge, clean up the branch
- `/wrap-up` — close out a session: tidy the repo, update the progress box, and
  add what was learned to [`docs/session-log.md`](docs/session-log.md)

**Read `docs/session-log.md` before starting.** The top entries record the bugs
that cost a day and the guards added since — including why production images
must not be built from Git Bash, and why a passing `curl` is not proof a feature
works.

**Merge with `./scripts/merge-pr.sh <number>`, never `gh pr merge`.** The latter
merges while checks are still queued — it has, twice. `main` has no server-side
protection because branch protection and rulesets both require GitHub Pro on a
private repository; the script is the substitute.

## Architecture

```
frontend/src/
  pages/         route components (14) — routed in App.jsx
  components/    app components; components/ui/ = 7 hand-written primitives
  lib/api/       client.ts — THE ONLY PLACE THAT CALLS fetch
  lib/adapters/  THE BACKEND SEAM — auth · designs · collectibles ·
                 entitlements · billing · vision · consent · errors
  lib/           AuthContext, premium.js, cart.js, catalog.js, utils.js (cn),
                 authReturnTo.js, query-client.js
  test/          setup.js, routes.test.jsx, no-linkage.test.js, smoke.test.js
backend/app/
  api/routes/    HTTP layer — no business logic
  services/      business rules — raise AppError subclasses
  repositories/  persistence — the only modules that know about Postgres
  schemas/       pydantic request/response models
  core/          errors.py (AppError → HTTP) · rate_limit.py
  admin.py       `python -m app.admin grant` — comps, server-side only
supabase/        schema.sql (idempotent) · seed.sql (dev only)
scripts/         setup-vm.sh · install-docker.sh · deploy.sh ·
                 merge-pr.sh · push-compose.sh
deploy/          docker-compose.prod.yml — the compose file production runs
```

Layering is one-directional: routes → services → repositories. A route never
touches a repository, and a repository never raises HTTP concerns.

## The adapter seam

`frontend/src/lib/adapters/` is the only place that reaches for a backend, and
`lib/api/client.ts` is the only place that calls `fetch`. Pages call adapters;
adapters call the client. Nothing skips a layer.

| Adapter | State |
|---|---|
| `designs.ts` | **Live** — `/api/designs` |
| `auth.ts` | **Live** — `/api/auth/*`, including Google via `signInWithProvider` |
| `collectibles.ts` | **Live** — `/api/collectibles`, `cc_collected` is a cache |
| `vision.ts` | **Live** — `/api/vision/verify-crayon` (low-level; prefer `collectibles.verify`) |
| `entitlements.ts` | **Live** — `/api/entitlements`, `cc_entitlements` is a cache |
| `billing.ts` | **Live** — `POST /api/billing/checkout`, then redirects to Stripe |
| `consent.js` | **Stub** — no backend equivalent for the MCP consent flow |

**Verification and unlocking are one server call.** There is deliberately no
"mark collected" endpoint — if a client could record an unlock without passing
the photo check, the check would be advisory and the mechanic honour-system.

Never make a stub return a fake success value — a stub that silently answers is
worse than one that fails loudly. `verifyCrayonPhoto` is the anti-cheat for
collectibles, so it runs server-side; never ship an API key to the browser.

## Client state: the `cc_*` contract

Designs, collectibles and entitlements now live in Postgres. `cc_collected` and
`cc_entitlements` remain as read-through **caches** so shelves and gated UI paint
instantly and survive an outage — the server is the source of truth. Still purely
local: `cc_trial_expiry`, `cc_trial_used`, `cc_cart`, and `cc_access_token` (the
session token, managed by `lib/api/client.ts`).

**`cc_cart` is a shopping basket, not an entitlement.** It holds physical crayon
packs the user means to buy — `{ [productId]: quantity }`, keyed by the ids in
`lib/catalog.js` so renaming a pack cannot orphan a basket. `lib/cart.js` owns
it; `/purchase` fills it and `/cart` shows it. Nothing about it is server-backed
and **nothing in it is paid for** — there is no checkout for packs, so a basket
is a wish list until fulfilment exists. Keep it clear of `premium.js`: one is
"what I intend to buy", the other is "what I already own", and merging them is
how a wish becomes an entitlement.

**Purchases are a redirect to Stripe.** `POST /api/billing/checkout` returns a
hosted Checkout URL; the browser never sees a Stripe key and no card data
touches this app. The grant happens only in `POST /api/billing/webhook`, which
verifies Stripe's signature — that check is the entire security model, and
without `STRIPE_WEBHOOK_SECRET` the endpoint refuses rather than trusting the
caller. A parent gate sits in front of the buy button; it is not security, it
stops a child reaching checkout by tapping a bright button.

**Entitlements are server-authoritative.** `hasFeature()` reads the
`cc_entitlements` cache first and falls back to the old `cc_<feature>` flag,
which the trial still writes. There is deliberately **no endpoint that grants**
an entitlement — a client that could grant its own would make paying optional.
Grants happen server-to-server in the Stripe webhook.

Three custom window events drive cross-component updates — dispatch them after
writing or the UI won't react:

- `cc-premium-change` — after any premium flag write
- `cc-collected-change` — after a collectibles write
- `cc-cart-change` — after a basket write; `/purchase` and `/cart` both edit the
  same basket, so each mirrors it rather than owning it

Reads fall back to empty/false on corrupt data. **Writes propagate**: a failed
save rejects so Kitchen's "Could not save design" alert can fire. Don't swallow
write errors — a saved design is user-created content that can't be re-derived.

The purely local flags are the exception, and the test is whether the user can
trivially redo the write. `premium.js` and `cart.js` both swallow a failed
`localStorage` write: tapping "Add to Cart" again costs nothing, whereas a lost
design is gone. Don't extend that licence to anything the user authored.

## UI parity — read before touching components/ui/

The seven survivors (`button`, `input`, `label`, `input-otp`, `toast`, `toaster`,
`use-toast`) were hand-written to replace shadcn/ui with class strings copied
**byte-for-byte**. Do not reformat, reorder or tidy a class string — identical
rendering is not the same as identical strings, and the strings are the guarantee.

Deliberately odd, do not "clean up":

- `animate-caret-blink` (input-otp) is **inert** — no keyframes exist and the
  caret has never blinked. Adding keyframes would change the UI.
- `toast.jsx` keeps `--radix-toast-swipe-*` vars and `data-[state=*]` selectors
  that nothing sets. Required for verbatim parity.
- `Toaster` renders two identical fixed containers; the viewport is always empty.

## Dependencies deliberately not present

`src/test/no-linkage.test.js` asserts the codebase is free of the old platform
SDK, `@radix-ui/*`, `class-variance-authority` and `input-otp`. That test encodes
a decision, not a permanent ban.

If a future feature genuinely wants one of these back — a complex combobox is a
fair reason to reconsider Radix — that's a real option. Reintroduce it as a
conscious choice: update `no-linkage.test.js` in the same commit and say why in
the message. What the test prevents is drifting back by accident.

Prefer hand-writing simple primitives; reach for a library when the primitive is
genuinely hard (focus management, virtualisation, accessible menus).

## Gotchas

- **`package.json` is `"type": "module"`.** `tailwind.config.js` must stay ESM
  (`export default`, `import tailwindcssAnimate`), never `module.exports`.
- **ESLint ignores `src/lib/**` and `src/components/ui/**`** (`eslint.config.js`)
  — the adapters and UI primitives are not linted. Don't assume lint covers them.
- **`ProtextedRoute.jsx`** — the typo is pre-existing and referenced by imports.
  Renaming is churn; leave it.
- **`AuthContext` treats a rejecting `getCurrentUser()` as signed out**, not an
  error. "Fixing" it makes `App.jsx` render its spinner forever when the API is
  unreachable or the user simply has no session.
- **`ForgotPassword` always shows success**, even on failure. Anti-enumeration:
  it must not reveal whether an account exists. Do not add an error banner.
- **`OAuthConsent`'s `setReconnect` is intentionally unused**, with an
  eslint-disable. Deleting it cascades into deleting live UI.
- **`/kitchen` and `/library` are behind `ProtectedRoute`** in App.jsx; the
  other pages are local-only and work signed out. Signed out, those two
  redirect to `/login` rather than rendering a screen full of 401s.
- **The API client refreshes tokens on a 401 and replays the request once.**
  `isRetry` stops an infinite loop; a shared in-flight promise means a burst of
  concurrent 401s triggers one refresh, not one per request.
- **Auth endpoints are rate limited in-process** (`core/rate_limit.py`). Per
  container, so two workers get two budgets and a restart clears it — it slows
  credential stuffing, it is not an edge rule. Cloudflare is the right place
  for real protection.
- **CI runs the Docker builds** (`.github/workflows/ci.yml`) because a broken
  Dockerfile otherwise only surfaces mid-deploy. It also smoke-tests that the
  API image answers `/api/health` with no configuration at all.
- **`ColouringLab.jsx` is a placeholder** — the original was missing or corrupt.
  A real implementation is still needed.
- **Never build production images from Git Bash.** MSYS rewrites leading-slash
  arguments, so `--build-arg VITE_API_BASE_URL=/api` baked
  `C:/Program Files/Git/api` into the bundle and every API call broke. Build
  from PowerShell, and `grep -c 'Program Files'` the built asset — expect 0.
- **The compose file production runs must be the one under review.** The VM's
  copy drifted, three Stripe variables never reached the container, and a real
  payment failed with a 503. `deploy/docker-compose.prod.yml` is in git, shipped
  by `scripts/push-compose.sh`; `tests/test_compose_parity.py` fails on drift.
- **Comps go through `python -m app.admin grant` on the VM**, or a 100%-off
  Stripe promotion code — never a new endpoint. The webhook is the only thing
  that may grant an entitlement over HTTP; a second path means a bug in its
  guard frees every paid feature. Grants record `source='grant'`.
- **`VITE_API_BASE_URL` is inlined at BUILD time**, not read at runtime.
  Changing it needs `docker compose build frontend`; a restart does nothing.
- **Data and auth use different credentials, and both are required.**
  `DATABASE_URL` is direct PostgreSQL for `crayon_designs` and `collectibles`;
  the Supabase key is for GoTrue — register, OTP, login, reset, refresh — which
  has no SQL equivalent. `/api/health/ready` reports them separately, so
  `"database": true, "auth": false` is a real state and means logins fail while
  saved designs work.
- **Use Supabase's session-pooler DSN, not the direct `:5432` host.** The
  direct host is IPv6-only on newer projects and will not resolve from an IPv4
  VM. The failure looks like a hang, not a config error.
- **Repository SQL is composed with `psycopg.sql`, never f-strings.** `sort` and
  the PATCH keys come from the request; identifiers cannot be bound parameters,
  so they are whitelisted (`SORTABLE`, `UPDATABLE`) *and* quoted. Values are
  always bound. `tests/test_repositories.py` covers exactly this.
- **The Supabase service role key bypasses row-level security, and so does the
  database connection.** Both connect as an owner-level role, so the `user_id`
  scoping in every repository method is load-bearing, not defence in depth.
  Backend only. If either lands in a `VITE_*` variable it is published to every
  visitor — rotate it immediately.
- **`@vitejs/plugin-react` must match the Vite major.** v4 does not support
  Vite 8; a mismatch only surfaces on a clean `npm ci`, which is what the
  Docker build runs.
- **Backend layering is one-directional.** Routes never touch repositories.
  Services raise `AppError` subclasses; `core/errors.py` maps them to HTTP, so
  routes never build an error response by hand.
- **Upstream error text never reaches the client.** Supabase distinguishes
  "no such user" from "wrong password"; both surface as one generic message.
  Keep it that way — the difference is an account-enumeration oracle.

## Testing

Vitest + jsdom + Testing Library. `src/test/setup.js` clears localStorage after
every test.

`routes.test.jsx` mounts the **real** `App.jsx` at each route. It exists because
this repo has had four separate "file is missing or is a copy of the wrong file"
bugs that crashed a route while the build stayed silent. Keep it passing.

Kitchen needs a `getContext` spy under jsdom (no canvas package installed).
