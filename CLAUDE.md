# Crayon Cookout

Kids' crayon-design PWA. Vite + React 18 + React Router 6 + Tailwind 3.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build
npm test         # vitest run (106 tests)
npm run lint     # eslint — must exit 0
```

All three of build / test / lint are expected to pass. Treat any of them failing
as a regression, not as background noise.

## Workflow

- `/start-work` — branch, implement, verify, commit, push, open a PR
- `/complete-work` — review the PR, merge, clean up the branch

## Architecture

```
src/
  pages/         route components (12) — routed in App.jsx
  components/    app components; components/ui/ = 7 hand-written primitives
  lib/adapters/  THE BACKEND SEAM — nothing else talks to a backend
  lib/           AuthContext, premium.js, utils.js (cn)
  test/          setup.js, routes.test.jsx, no-linkage.test.js
```

## The adapter seam

`src/lib/adapters/` is the only place that reaches for a backend. The app was
de-platformed off a hosted low-code provider; these four modules replaced it.

| Adapter | State |
|---|---|
| `designs.js` | **Works** — localStorage under `cc_designs` |
| `auth.js` | **Stub** — all 11 methods throw `NotImplementedError` |
| `vision.js` | **Stub** — collectible photo verification |
| `consent.js` | **Stub** — OAuth/MCP consent |

The stubs throw *on purpose*. Wiring a real backend means editing these files and
nothing else. Never make a stub return a fake success value — a stub that
silently answers is worse than one that fails loudly. `verifyCrayonPhoto` is the
anti-cheat for collectibles, so it must run server-side; never ship an API key to
the browser.

## Client state: the `cc_*` contract

All persistence is localStorage under `cc_*`: `cc_designs`, `cc_collected`,
`cc_trial_expiry`, and `cc_<feature>` flags (see `lib/premium.js`).

Two custom window events drive cross-component updates — dispatch them after
writing or the UI won't react:

- `cc-premium-change` — after any premium flag write
- `cc-collected-change` — after a collectibles write

Reads fall back to empty/false on corrupt data. **Writes propagate**: a failed
`designs` write rejects so Kitchen's "Could not save design" alert can fire.
Don't swallow write errors — a saved design is user-created content that can't be
re-derived.

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
  error. Required while auth is stubbed — "fixing" it makes `App.jsx` render its
  spinner forever.
- **`ForgotPassword` always shows success**, even on failure. Anti-enumeration:
  it must not reveal whether an account exists. Do not add an error banner.
- **`OAuthConsent`'s `setReconnect` is intentionally unused**, with an
  eslint-disable. Deleting it cascades into deleting live UI.
- **`AdBar.jsx` and `ColouringLab.jsx` are placeholders** — the originals were
  missing or corrupt. Real implementations still needed.

## Testing

Vitest + jsdom + Testing Library. `src/test/setup.js` clears localStorage after
every test.

`routes.test.jsx` mounts the **real** `App.jsx` at each route. It exists because
this repo has had four separate "file is missing or is a copy of the wrong file"
bugs that crashed a route while the build stayed silent. Keep it passing.

Kitchen needs a `getContext` spy under jsdom (no canvas package installed).
