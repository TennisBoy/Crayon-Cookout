# Crayon Cookout

Kids' crayon-design app. React SPA (Vite) + FastAPI + Supabase, deployed by
Docker Compose on a single VM behind a Cloudflare Tunnel.

**Monorepo**: the SPA lives in `frontend/`, the API in `backend/`. Run npm
commands from `frontend/`, python commands from `backend/`.

## Commands

```bash
cd frontend && npm install && npm run dev    # SPA on :5173
cd frontend && npm test                      # 100 tests
cd frontend && npm run build                 # production bundle
cd frontend && npm run lint                  # must exit 0
cd frontend && npm run typecheck             # tsc --noEmit
cd frontend && npm run verify                # all four, in order

cd backend && python -m venv .venv
cd backend && .venv/bin/pip install -r requirements-dev.txt
cd backend && .venv/bin/uvicorn app.main:app --reload   # API on :8000
cd backend && pytest                         # 73 tests
cd backend && ruff check .                   # must pass

docker compose up -d --build                 # whole stack
```

All gates — frontend tests, build, lint, backend tests — are expected to pass.
Treat any failure as a regression, not background noise.

## Deployment is IN PROGRESS — read this first

The owner is part-way through first-time setup. **`docs/SETUP.md` holds the
ordered walkthrough and a progress box saying exactly which step is next.**
Read it before answering any "what do I do now" question, and update the
progress box as steps complete.

Nothing has ever run against the real Supabase project or a VM yet, so the
integration is unexercised: the test suites fake the repositories so CI needs
no secrets, which means a wrong column name or an RLS policy that rejects the
service role would not have been caught.

**Never ask for, accept, or echo a secret in conversation.** Credentials belong
in `.env` on the VM. To check whether something is configured, ask for a
command that prints a boolean:
`curl -s localhost:8000/api/health/ready`.

## Workflow

- `/start-work` — branch, implement, verify, commit, push, open a PR
- `/complete-work` — review the PR, merge, clean up the branch

**Merge with `./scripts/merge-pr.sh <number>`, never `gh pr merge`.** The latter
merges while checks are still queued — it has, twice. `main` has no server-side
protection because branch protection and rulesets both require GitHub Pro on a
private repository; the script is the substitute.

## Architecture

```
frontend/src/
  pages/         route components (12) — routed in App.jsx
  components/    app components; components/ui/ = 7 hand-written primitives
  lib/api/       client.ts — THE ONLY PLACE THAT CALLS fetch
  lib/adapters/  THE BACKEND SEAM — auth · designs · vision · consent
  lib/           AuthContext, premium.js, utils.js (cn)
  test/          setup.js, routes.test.jsx, no-linkage.test.js
backend/app/
  api/routes/    HTTP layer — no business logic
  services/      business rules — raise AppError subclasses
  repositories/  persistence — the only modules that know about Postgres
  schemas/       pydantic request/response models
supabase/        schema.sql (idempotent) · seed.sql (dev only)
scripts/         setup-vm.sh · install-docker.sh · deploy.sh
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
| `auth.ts` | **Live** — `/api/auth/*`, except `signInWithProvider` |
| `collectibles.ts` | **Live** — `/api/collectibles`, `cc_collected` is a cache |
| `vision.ts` | **Live** — `/api/vision/verify-crayon` (low-level; prefer `collectibles.verify`) |
| `entitlements.ts` | **Live** — `/api/entitlements`, `cc_entitlements` is a cache |
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
local: `cc_trial_expiry`, `cc_trial_used`, and `cc_access_token` (the session
token, managed by `lib/api/client.ts`).

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

Two custom window events drive cross-component updates — dispatch them after
writing or the UI won't react:

- `cc-premium-change` — after any premium flag write
- `cc-collected-change` — after a collectibles write

Reads fall back to empty/false on corrupt data. **Writes propagate**: a failed
save rejects so Kitchen's "Could not save design" alert can fire. Don't swallow
write errors — a saved design is user-created content that can't be re-derived.

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
- **`AdBar.jsx` and `ColouringLab.jsx` are placeholders** — the originals were
  missing or corrupt. Real implementations still needed.
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
