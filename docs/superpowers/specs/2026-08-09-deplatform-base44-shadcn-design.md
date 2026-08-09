# De-platforming Crayon Cookout: removing base44 and shadcn/ui

**Date:** 2026-08-09
**Status:** Approved design, pending implementation plan
**Baseline commit:** `82f659c`

## Goal

Remove every dependency on the base44 platform and every trace of shadcn/ui from
the Crayon Cookout app, while keeping the rendered UI visually identical to the
current design.

Two constraints drive the whole design:

1. **Visual parity is a hard requirement.** Replacement components reuse the
   existing Tailwind class strings verbatim. No restyling, no "improvements".
2. **base44 leaves behind a seam, not a hole.** Every capability base44 provided
   is re-expressed as a small adapter module with a documented interface, so a
   real backend can be dropped in later by editing one file.

## Baseline reality

The repository does not currently build. This is true before any of the work
below and is not caused by it.

| Problem | Detail |
| --- | --- |
| Missing module | `@/api/base44Client` is imported by 8 files; `src/api/` does not exist |
| Empty manifest | `package.json` is 0 bytes — no dependencies are declared |
| Empty build config | `vite.config.js` is 0 bytes — no React plugin, no `@` alias |
| Folder name mismatch | Imports and `jsconfig.json` say `@/components`; the folder on disk is `src/component` |
| Duplicate file bug | `src/component/ui/input.jsx` is byte-identical to `input-otp.jsx`, exports no `Input` |
| Duplicate file bug | `src/pages/ColouringLab.jsx` is a copy of `lib/utils.js`, has no default export |

Consequences worth stating plainly, because they bound what "keep the UI the
same" can mean:

- `Login`, `Register`, `ForgotPassword` and `ResetPassword` import `Input` from a
  module that does not export it. They render `undefined` and crash. **There is
  no current appearance for these pages to match.**
- `/colouring-lab` crashes for the same class of reason.

For every component that does render today, parity means byte-identical class
strings. For `Input`, parity is impossible by definition, so it is authored to
the conventions the sibling components already use — see "Authored Input" below.

## Scope

### In scope

- Removing all base44 SDK usage, env plumbing and platform endpoints
- Replacing the 7 reachable shadcn components with dependency-free equivalents
- Deleting the 43 unreachable shadcn components and their support files
- Authoring `package.json` and `vite.config.js` so the project builds
- Renaming `src/component` → `src/components`
- Fixing the two duplicate-file bugs, because they block verification

### Out of scope

- Any restyling or redesign
- Replacing `@tanstack/react-query`
- Building a real backend, auth service or vision endpoint
- Rewriting `Silhouettes.jsx`, `CrayonShape.jsx` or any app-specific component

## Architecture

### Build prerequisites

**Rename `src/component` → `src/components`.** Every import already says
`@/components/...`, `jsconfig.json` maps `@/*` → `./src/*`, and `components.json`
declares the same. Renaming the directory fixes 30+ imports without editing a
single import statement.

**Author `package.json`** from what the code actually imports:

- Runtime: `react`, `react-dom`, `react-router-dom`, `framer-motion`,
  `lucide-react`, `@tanstack/react-query`, `clsx`, `tailwind-merge`
- Dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`,
  `tailwindcss-animate`, `eslint` and the configs `eslint.config.js` references

Deliberately absent: `@base44/sdk`, `@radix-ui/*`, `class-variance-authority`,
`input-otp`.

**Author `vite.config.js`** with `@vitejs/plugin-react` and `resolve.alias`
mapping `@` → `./src`, mirroring `jsconfig.json`.

### The adapter layer

Four modules under `src/lib/adapters/`. Nothing else in the app imports a
backend. Stubs throw `NotImplementedError` — a small named error class exported
from `src/lib/adapters/errors.js` — carrying a message that names the adapter
method and says it needs a backend.

#### `auth.js` — stubbed

Every method throws. The interface is derived from the existing call sites, so
each page changes only its import and its call expression — no page logic or
markup moves.

Two call sites need slightly more than a rename, because the adapter normalises
base44's naming:

- `Register.jsx` reads `result.access_token` from `verifyOtp`; the adapter
  returns `{ accessToken }`, so that property reference changes.
- `AuthContext.logout` calls `base44.auth.logout(url)` or `logout()` depending on
  a `shouldRedirect` flag; the adapter's `signOut(returnTo)` takes `returnTo` as
  optional and the flag logic stays in `AuthContext`.

The full interface:

| Method | Replaces | Called from |
| --- | --- | --- |
| `signIn({ email, password })` | `base44.auth.loginViaEmailPassword` | `Login.jsx` |
| `signUp({ email, password })` | `base44.auth.register` | `Register.jsx` |
| `verifyOtp({ email, code })` → `{ accessToken }` | `base44.auth.verifyOtp` | `Register.jsx` |
| `resendOtp(email)` | `base44.auth.resendOtp` | `Register.jsx` |
| `setToken(token)` | `base44.auth.setToken` | `Register.jsx` |
| `requestPasswordReset(email)` | `base44.auth.resetPasswordRequest` | `ForgotPassword.jsx` |
| `resetPassword({ token, newPassword })` | `base44.auth.resetPassword` | `ResetPassword.jsx` |
| `signInWithProvider(provider, returnTo)` | `base44.auth.loginWithProvider` | `Login.jsx`, `Register.jsx` |
| `getCurrentUser()` | `base44.auth.me` | `AuthContext.jsx`, `PageNotFound.jsx` |
| `signOut(returnTo)` | `base44.auth.logout` | `AuthContext.jsx` |
| `redirectToLogin(returnTo)` | `base44.auth.redirectToLogin` | `AuthContext.jsx` |

#### `designs.js` — localStorage

Backs the `CrayonDesign` entity under the `cc_designs` key, matching the `cc_*`
convention `premium.js` already uses. Records get a generated `id` and a
`created_date` ISO timestamp so existing sort and delete code keeps working.

| Method | Replaces |
| --- | --- |
| `list(sort, limit)` | `base44.entities.CrayonDesign.list('-created_date', 50)` |
| `create(design)` | `base44.entities.CrayonDesign.create` |
| `update(id, patch)` | `base44.entities.CrayonDesign.update` |
| `remove(id)` | `base44.entities.CrayonDesign.delete` |

`list` supports the `-created_date` descending sort the callers pass. Methods are
async so call sites keep their `await` and `.then()` shapes unchanged.

#### `vision.js` — stubbed

`verifyCrayonPhoto(file, { type, color })` → `{ matched: boolean }`, replacing
`base44.integrations.Core.UploadFile` + `InvokeLLM`. Throws today.

`Library.jsx`'s existing `catch` already sets a failure result, so a throw
surfaces as the current "didn't match" state. The scan UI, camera button and
`cc_collected` storage are all untouched.

#### `consent.js` — stubbed

`OAuthConsent.jsx` talks to two base44 platform endpoints,
`/api/apps/{appId}/mcp/consent-info` and `/api/apps/{appId}/mcp/authorize-grant`.
These are base44's MCP consent protocol and have no meaning without base44.

`fetchConsentInfo(handle)` and `grantConsent(payload)` are stubbed so the page's
UI survives intact for a future backend. This is a judgement call in the spirit
of "keep the pages, stub the adapter" — deleting the page instead is a
reasonable alternative if that UI is not worth keeping.

### AuthContext

`AuthContext.jsx` is rewritten against `auth.js`. It drops the
`createAxiosClient` call to base44's app-public-settings endpoint and the
`appParams` token handling entirely.

Its exported shape is unchanged — `user`, `isAuthenticated`, `isLoadingAuth`,
`isLoadingPublicSettings`, `authError`, `appPublicSettings`, `authChecked`,
`logout`, `navigateToLogin`, `checkUserAuth`, `checkAppState` — so `App.jsx`,
`ProtextedRoute.jsx` and `UserNotRegisteredError.jsx` need no changes.

With a stubbed auth adapter it resolves to a signed-out, non-loading state
rather than an error state, so the app renders its routes normally instead of
showing a spinner forever. `isLoadingPublicSettings` settles to `false`
immediately and `appPublicSettings` stays `null`.

### Routing

`App.jsx` currently routes only `/`, `/home`, `/purchase`, `/kitchen`,
`/colouring-lab`, `/shop`, `/library` and `*`. The auth pages have never been
reachable — base44 hosted those flows outside the app.

Add routes for `/login`, `/register`, `/forgot-password`, `/reset-password` and
`/oauth-consent`, matching the paths the pages already link to
(`Login.jsx` links to `/register` and `/forgot-password`).

## The component layer

All seven stay at their current paths with their current export names, so **no
page import changes**. Class strings are copied verbatim from the current files.

| File | Change |
| --- | --- |
| `button.jsx` | Drop `@radix-ui/react-slot` and `cva`. `buttonVariants({variant,size,className})` becomes a plain function over two lookup objects, returning `cn(base, variants[variant], sizes[size], className)`. All 6 variants and 4 sizes preserved verbatim. `asChild` is used nowhere in the app, so `Slot` is dropped rather than reimplemented. |
| `input.jsx` | Authored fresh — see below. |
| `label.jsx` | Drop `@radix-ui/react-label` and `cva`; render a plain `<label>` with the same class string. Radix Label's only behaviour beyond a native label is click-to-focus for non-native controls; every call site passes `htmlFor` against a native input, so nothing is lost. |
| `input-otp.jsx` | Hand-written — see below. |
| `toast.jsx` | Drop `cva`; keep every class string including the inert `data-[state=…]` and `data-[swipe=…]` variants. Already free of Radix. |
| `toaster.jsx` | Unchanged. |
| `use-toast.jsx` | Unchanged — already dependency-free (`TOAST_LIMIT` 20, `TOAST_REMOVE_DELAY` 1000000, i.e. no practical auto-dismiss). |

### Authored Input

`input.jsx` must be written from scratch because the current file is a duplicate
of `input-otp.jsx`. It renders a single `<input>` forwarding its ref and props,
with the class string following the same design-system conventions as its
siblings: `h-9`, `w-full`, `rounded-md`, `border border-input`, `bg-transparent`,
`px-3 py-1`, `text-base`, `shadow-sm`, `transition-colors`,
`placeholder:text-muted-foreground`, `focus-visible:outline-none`,
`focus-visible:ring-1 focus-visible:ring-ring`,
`disabled:cursor-not-allowed disabled:opacity-50`, `md:text-sm`, plus the
`file:` modifiers.

This composes correctly with the `className="pl-10 h-12"` the auth pages pass —
`tailwind-merge` resolves `h-9` against `h-12` in favour of the caller.

### Hand-written OTP input

Identical DOM to the current component: a container `div`, a group `div`, and
six slot `div`s carrying
`relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md`,
with `z-10 ring-1 ring-ring` applied to the active slot and the fake-caret
`div` preserved.

`animate-caret-blink` is retained verbatim even though it is currently inert —
it is defined neither in `tailwind.config.js` nor by `tailwindcss-animate`, so
the caret does not blink today and must not start blinking.

A single visually-hidden `<input>` positioned over the slots carries `value`,
`onChange`, `maxLength`, `autoFocus`, `autoComplete="one-time-code"` and
`inputMode="numeric"`, driving slot state from the controlled value.

Behaviours to reproduce and verify:

- Typing a digit fills the current slot and advances
- Backspace clears and steps back
- Left/right arrows move the active slot
- Pasting a 6-digit code fills all six slots
- Mobile SMS autofill populates the whole code
- The active-slot ring follows the caret position
- Non-digit input is rejected

### Preserved quirk

`Toaster` renders both `ToastProvider` and `ToastViewport`, which produce two
identical `fixed top-0 z-[100] …` containers; the viewport always renders empty.
This is preserved deliberately — it is harmless and it is what ships today.

## Deletions

47 files and paths, all verified unreachable from app code.

**43 shadcn components** in `src/components/ui/`: accordion, alert-dialog,
alert, aspect-ratio, avatar, badge, breadcrumb, calendar, card, carousel, chart,
checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu,
form, hover-card, image, menubar, navigation-menu, pagination, popover,
progress, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group,
toggle, tooltip.

`image.jsx` is base44's Wix-media component (`media.base44.com`), not stock
shadcn, and goes for both reasons.

**Support files:**

- `src/hooks/use-size.jsx` — used only by `image.jsx`
- `src/hooks/use-mobile.jsx` — used only by `sidebar.jsx`
- `components.json` — the shadcn CLI manifest
- `src/lib/app-params.js` — base44 env and token plumbing

**`tailwind.config.js` edits:** remove the `chart` and `sidebar` colour entries
(their CSS variables `--chart-1..5` and `--sidebar-*` are not defined in
`index.css`, and no remaining class references them) and the `accordion-down` /
`accordion-up` keyframes and animations.

`tailwindcss-animate` is **kept**. It is a general Tailwind plugin rather than
shadcn code, and keeping it guarantees the inert animation classes retained in
`toast.jsx` cannot change rendering.

**Kept:** `src/index.css` design tokens, `src/lib/utils.js` (`cn`), the `cc_*`
localStorage conventions, `@tanstack/react-query`.

## Bug fixes required for verification

`src/pages/ColouringLab.jsx` is a copy of `lib/utils.js` with no default export,
so `/colouring-lab` crashes. The route cannot be walked during verification
while this holds.

It is replaced with a minimal placeholder page component with a default export,
styled with the app's existing conventions, so the route renders instead of
crashing. Building the actual Colouring Lab feature is out of scope; this is the
smallest change that unblocks verification.

## Error handling

- Stub adapters throw `NotImplementedError` with a message naming the method.
- `Login`, `Register`, `ForgotPassword` and `ResetPassword` already wrap their
  calls in `try/catch` and render `err.message` into their existing error banner,
  so a stub surfaces as readable in-page text rather than an unhandled rejection.
- `Library.jsx`'s scan handler already catches and shows a failure result.
- `AuthContext` treats a stubbed `getCurrentUser` as signed-out rather than as
  an error, so the app renders normally.
- `designs.js` guards `JSON.parse` and `localStorage` access in `try/catch` and
  falls back to an empty list, matching the defensive style of `premium.js`.

## Verification

**Build:** `npm install` then `npm run build` must both succeed.

**Zero linkage:** a repository grep must return no hits for `base44`,
`@radix-ui`, `class-variance-authority`, `input-otp` or `shadcn`, outside
`.gitignore` and this document.

**Routes:** with `npm run dev`, every route renders without a console error:
`/`, `/home`, `/purchase`, `/kitchen`, `/colouring-lab`, `/shop`, `/library`,
`/login`, `/register`, `/forgot-password`, `/reset-password`, `/oauth-consent`,
and a 404 path.

**Visual parity:** the pages that render today — Splash, Home, Purchase, Kitchen,
Shop, Library — must be visually unchanged. Since class strings are copied
verbatim and no page markup is edited, any difference indicates a mistake.

**Functional:** save a design in Kitchen, confirm it appears in Library, edit and
delete it. Confirm collectibles still toggle from `cc_collected` and premium
flags still gate Kitchen and Shop.

**OTP:** walk the seven behaviours listed above against the Register page.

## Risks

| Risk | Mitigation |
| --- | --- |
| Hand-written OTP behaves subtly differently on mobile | Explicit behaviour checklist; `input-otp` can be reinstated if a gap is found |
| `Input` has no baseline to match | Documented as an explicit assumption; conventions taken from sibling components |
| A deleted component turns out to be needed later | Baseline commit `82f659c` holds every deleted file |
| Authored `package.json` pins versions that conflict | Install and build are part of verification |
