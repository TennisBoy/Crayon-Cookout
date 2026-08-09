# Crayon Cookout De-platforming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every base44 dependency and every trace of shadcn/ui from Crayon Cookout while keeping the rendered UI pixel-identical.

**Architecture:** base44's capabilities become four small adapter modules under `src/lib/adapters/` — `auth`, `designs`, `vision`, `consent` — with `designs` backed by `localStorage` and the rest throwing `NotImplementedError` until a backend exists. The seven reachable shadcn components are rewritten as dependency-free React with their Tailwind class strings copied verbatim, and the 43 unreachable ones are deleted.

**Tech Stack:** React 18, Vite 5, React Router 6, Tailwind CSS 3, framer-motion, lucide-react, @tanstack/react-query. Tests: Vitest + @testing-library/react + @testing-library/user-event, jsdom.

## Global Constraints

- **Visual parity is a hard requirement.** Every Tailwind class string in a rewritten component must be copied byte-for-byte from the baseline. Never reformat, reorder, or "tidy" a class string.
- **No page markup changes.** Pages change only their imports and call expressions. JSX structure, classes and copy stay as they are.
- **Forbidden dependencies:** `@base44/sdk`, `@radix-ui/*`, `class-variance-authority`, `input-otp`, `cmdk`, `vaul`, `sonner`, `embla-carousel-react`, `react-day-picker`, `recharts`, `react-hook-form`, `react-resizable-panels`, `next-themes`.
- **Component paths and export names are frozen.** Rewrites keep their current file path and every current named export, so no importing page needs editing.
- **`animate-caret-blink` stays inert.** It is defined neither in `tailwind.config.js` nor by `tailwindcss-animate`. Preserve the class; do not add the keyframes.
- **`tailwindcss-animate` is kept**, and the inert `data-[state=…]` / `data-[swipe=…]` classes in `toast.jsx` are kept verbatim.
- **Baseline commit for reference:** `82f659c`. Any deleted file can be recovered with `git show 82f659c:<path>`.
- **`package.json` must set `"type": "module"`** — `postcss.config.js` and `eslint.config.js` already use `export default`.
- **Spec:** `docs/superpowers/specs/2026-08-09-deplatform-base44-shadcn-design.md`

### Deviation from the spec

The spec's dependency list did not include a test framework. This plan adds **Vitest, jsdom, @testing-library/react and @testing-library/user-event as devDependencies**. Justification: they are the only way to mechanically enforce the parity constraint (asserting exact rendered `className` strings) and to verify the seven hand-written OTP behaviours. They ship no runtime code. If you object, Task 1 is the only place to remove them, and every later task's tests would become a manual checklist.

### Expected-failing build

`npm run build` **cannot pass** until Task 12. Until then the app still imports `@/api/base44Client`, which does not exist. Tasks 1–11 are verified by their unit tests, not by a full build. Do not treat a failing `npm run build` before Task 12 as a regression.

---

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `package.json` | Dependency manifest, scripts, `"type": "module"` |
| `vite.config.js` | React plugin, `@` → `./src` alias, Vitest jsdom config |
| `src/test/setup.js` | Testing Library jest-dom matchers, per-test `localStorage` reset |
| `src/lib/adapters/errors.js` | `NotImplementedError` |
| `src/lib/adapters/auth.js` | Auth interface, fully stubbed |
| `src/lib/adapters/designs.js` | `CrayonDesign` CRUD over `localStorage` |
| `src/lib/adapters/vision.js` | Crayon photo verification, stubbed |
| `src/lib/adapters/consent.js` | MCP consent endpoints, stubbed |

**Modified:**

| Path | Change |
| --- | --- |
| `src/component/` → `src/components/` | Directory rename |
| `src/components/ui/button.jsx` | Drop `cva` + `Slot` |
| `src/components/ui/input.jsx` | Authored fresh (currently an OTP duplicate) |
| `src/components/ui/label.jsx` | Drop `cva` + Radix Label |
| `src/components/ui/input-otp.jsx` | Hand-written, drops `input-otp` |
| `src/components/ui/toast.jsx` | Drop `cva` |
| `src/lib/AuthContext.jsx` | Rewrite against `adapters/auth` |
| `src/lib/PageNotFound.jsx` | Swap `base44.auth.me` → `getCurrentUser` |
| `src/App.jsx` | Add five auth routes |
| `src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` | Swap auth call sites |
| `src/pages/OAuthConsent.jsx` | Swap to `adapters/consent` |
| `src/pages/Kitchen.jsx`, `Library.jsx` | Swap to `adapters/designs` and `adapters/vision` |
| `src/pages/ColouringLab.jsx` | Replace duplicate-of-utils with a placeholder page |
| `tailwind.config.js` | ESM, drop `chart`/`sidebar` colours and accordion keyframes |

**Deleted:** 43 `ui/` components, `src/hooks/use-size.jsx`, `src/hooks/use-mobile.jsx`, `components.json`, `src/lib/app-params.js`.

---

## Task 1: Build scaffolding

Makes the project installable and testable. Does **not** make it build — see "Expected-failing build".

**Files:**
- Rename: `src/component/` → `src/components/`
- Create: `package.json`, `vite.config.js`, `src/test/setup.js`
- Test: `src/test/smoke.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: the `@` → `./src` alias every later import relies on; `npm test` as the verification command for Tasks 2–11

- [ ] **Step 1: Rename the component directory**

```bash
git mv src/component src/components
```

Every import already says `@/components/...`, so this fixes them all without editing a file.

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "crayon-cookout",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "clsx": "^2.1.1",
    "framer-motion": "^11.11.0",
    "lucide-react": "^0.451.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "@testing-library/jest-dom": "^6.6.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.13.0",
    "eslint-plugin-react": "^7.37.1",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-unused-imports": "^4.1.4",
    "globals": "^15.11.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "tailwindcss-animate": "^1.0.7",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 3: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
```

- [ ] **Step 4: Write `src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
```

- [ ] **Step 5: Write the smoke test**

```js
// src/test/smoke.test.js
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('build scaffolding', () => {
  it('resolves the @ alias and merges classes', () => {
    expect(cn('h-9', 'h-12')).toBe('h-12')
  })
})
```

- [ ] **Step 6: Install and run**

Run: `npm install && npm test`
Expected: install completes; smoke test PASSES. `npm run build` still fails — that is expected until Task 12.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: add package.json, vite config and test harness

Renames src/component to src/components so the existing @/components
imports resolve. Adds Vitest with jsdom so the de-platforming work can
be verified per-task; npm run build stays broken until base44 imports
are removed."
```

---

## Task 2: NotImplementedError and the auth adapter

**Files:**
- Create: `src/lib/adapters/errors.js`, `src/lib/adapters/auth.js`
- Test: `src/lib/adapters/auth.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `NotImplementedError` — `class NotImplementedError extends Error`, constructor takes `(method)`, sets `name = 'NotImplementedError'` and `message = \`${method} needs a backend — no auth provider is configured.\``
  - `auth.js` named exports, all `async` and all throwing: `signIn({email, password})`, `signUp({email, password})`, `verifyOtp({email, code}) → {accessToken}`, `resendOtp(email)`, `setToken(token)`, `requestPasswordReset(email)`, `resetPassword({token, newPassword})`, `signInWithProvider(provider, returnTo)`, `getCurrentUser()`, `signOut(returnTo)`, `redirectToLogin(returnTo)`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/adapters/auth.test.js
import { describe, it, expect } from 'vitest'
import { NotImplementedError } from '@/lib/adapters/errors'
import * as auth from '@/lib/adapters/auth'

const METHODS = [
  ['signIn', [{ email: 'a@b.c', password: 'x' }]],
  ['signUp', [{ email: 'a@b.c', password: 'x' }]],
  ['verifyOtp', [{ email: 'a@b.c', code: '123456' }]],
  ['resendOtp', ['a@b.c']],
  ['setToken', ['tok']],
  ['requestPasswordReset', ['a@b.c']],
  ['resetPassword', [{ token: 't', newPassword: 'x' }]],
  ['signInWithProvider', ['google', '/']],
  ['getCurrentUser', []],
  ['signOut', ['/']],
  ['redirectToLogin', ['/']],
]

describe('auth adapter', () => {
  it('exports every method the pages call', () => {
    for (const [name] of METHODS) {
      expect(typeof auth[name]).toBe('function')
    }
  })

  it.each(METHODS)('%s rejects with NotImplementedError naming itself', async (name, args) => {
    await expect(auth[name](...args)).rejects.toThrow(NotImplementedError)
    await expect(auth[name](...args)).rejects.toThrow(name)
  })

  it('reports a message a user can read in an error banner', async () => {
    await expect(auth.signIn({ email: 'a@b.c', password: 'x' }))
      .rejects.toThrow(/needs a backend/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth.test.js`
Expected: FAIL — cannot resolve `@/lib/adapters/errors`

- [ ] **Step 3: Write `errors.js`**

```js
export class NotImplementedError extends Error {
  constructor(method) {
    super(`${method} needs a backend — no auth provider is configured.`)
    this.name = 'NotImplementedError'
    this.method = method
  }
}
```

- [ ] **Step 4: Write `auth.js`**

```js
/**
 * Auth adapter.
 *
 * Replaces base44.auth.*. Every method is stubbed: wire a real provider by
 * replacing the bodies below. Signatures are fixed — the auth pages and
 * AuthContext call them directly.
 */
import { NotImplementedError } from './errors'

/** @returns {Promise<{id: string, email: string}>} */
export async function signIn({ email, password }) {
  void email; void password
  throw new NotImplementedError('signIn')
}

/** @returns {Promise<void>} */
export async function signUp({ email, password }) {
  void email; void password
  throw new NotImplementedError('signUp')
}

/** @returns {Promise<{accessToken: string}>} */
export async function verifyOtp({ email, code }) {
  void email; void code
  throw new NotImplementedError('verifyOtp')
}

/** @returns {Promise<void>} */
export async function resendOtp(email) {
  void email
  throw new NotImplementedError('resendOtp')
}

/** @returns {Promise<void>} */
export async function setToken(token) {
  void token
  throw new NotImplementedError('setToken')
}

/** @returns {Promise<void>} */
export async function requestPasswordReset(email) {
  void email
  throw new NotImplementedError('requestPasswordReset')
}

/** @returns {Promise<void>} */
export async function resetPassword({ token, newPassword }) {
  void token; void newPassword
  throw new NotImplementedError('resetPassword')
}

/** @returns {Promise<void>} */
export async function signInWithProvider(provider, returnTo) {
  void provider; void returnTo
  throw new NotImplementedError('signInWithProvider')
}

/** @returns {Promise<{id: string, email: string}>} */
export async function getCurrentUser() {
  throw new NotImplementedError('getCurrentUser')
}

/** @returns {Promise<void>} */
export async function signOut(returnTo) {
  void returnTo
  throw new NotImplementedError('signOut')
}

/** @returns {Promise<void>} */
export async function redirectToLogin(returnTo) {
  void returnTo
  throw new NotImplementedError('redirectToLogin')
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- auth.test.js`
Expected: PASS (13 assertions)

- [ ] **Step 6: Commit**

```bash
git add src/lib/adapters/errors.js src/lib/adapters/auth.js src/lib/adapters/auth.test.js
git commit -m "feat: add stubbed auth adapter replacing base44.auth"
```

---

## Task 3: The designs adapter

**Files:**
- Create: `src/lib/adapters/designs.js`
- Test: `src/lib/adapters/designs.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `list(sort, limit) → Promise<Design[]>`, `create(design) → Promise<Design>`, `update(id, patch) → Promise<Design>`, `remove(id) → Promise<void>`. A `Design` is the caller's object plus `id: string` and `created_date: string` (ISO). Storage key `cc_designs`.

Call sites this must satisfy, from the baseline:
- `Kitchen.jsx:118` — `create({ name, colors, heights, shape })`
- `Library.jsx:130,155` — `list('-created_date', 50)`
- `Library.jsx:171` — `remove(id)`
- `Library.jsx:288` — `update(id, { is_competition_entry: true, competition_email })`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/adapters/designs.test.js
import { describe, it, expect } from 'vitest'
import { list, create, update, remove } from '@/lib/adapters/designs'

describe('designs adapter', () => {
  it('starts empty', async () => {
    expect(await list('-created_date', 50)).toEqual([])
  })

  it('assigns an id and created_date on create', async () => {
    const saved = await create({ name: 'Sunset', colors: ['#EF4444'], heights: [1], shape: 'crayon' })
    expect(saved.id).toEqual(expect.any(String))
    expect(saved.created_date).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(saved.created_date))).toBe(false)
    expect(saved.name).toBe('Sunset')
  })

  it('gives every design a distinct id', async () => {
    const a = await create({ name: 'A' })
    const b = await create({ name: 'B' })
    expect(a.id).not.toBe(b.id)
  })

  it('sorts newest first for -created_date', async () => {
    await create({ name: 'first', created_date: '2020-01-01T00:00:00.000Z' })
    await create({ name: 'second', created_date: '2030-01-01T00:00:00.000Z' })
    const rows = await list('-created_date', 50)
    expect(rows.map(r => r.name)).toEqual(['second', 'first'])
  })

  it('sorts oldest first for created_date', async () => {
    await create({ name: 'first', created_date: '2020-01-01T00:00:00.000Z' })
    await create({ name: 'second', created_date: '2030-01-01T00:00:00.000Z' })
    const rows = await list('created_date', 50)
    expect(rows.map(r => r.name)).toEqual(['first', 'second'])
  })

  it('honours the limit', async () => {
    await create({ name: 'a' })
    await create({ name: 'b' })
    await create({ name: 'c' })
    expect(await list('-created_date', 2)).toHaveLength(2)
  })

  it('merges a patch on update and leaves other fields alone', async () => {
    const saved = await create({ name: 'Sunset', colors: ['#EF4444'] })
    const updated = await update(saved.id, { is_competition_entry: true, competition_email: 'a@b.c' })
    expect(updated.is_competition_entry).toBe(true)
    expect(updated.competition_email).toBe('a@b.c')
    expect(updated.name).toBe('Sunset')
    expect(updated.colors).toEqual(['#EF4444'])
    const [row] = await list('-created_date', 50)
    expect(row.is_competition_entry).toBe(true)
  })

  it('removes by id and leaves the rest', async () => {
    const a = await create({ name: 'a' })
    await create({ name: 'b' })
    await remove(a.id)
    const rows = await list('-created_date', 50)
    expect(rows.map(r => r.name)).toEqual(['b'])
  })

  it('returns an empty list when storage holds corrupt JSON', async () => {
    localStorage.setItem('cc_designs', '{not json')
    expect(await list('-created_date', 50)).toEqual([])
  })

  it('rejects when updating an unknown id', async () => {
    await expect(update('nope', { name: 'x' })).rejects.toThrow(/not found/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- designs.test.js`
Expected: FAIL — cannot resolve `@/lib/adapters/designs`

- [ ] **Step 3: Write `designs.js`**

```js
/**
 * CrayonDesign store.
 *
 * Replaces base44.entities.CrayonDesign with localStorage under `cc_designs`,
 * matching the cc_* convention in lib/premium.js. Swap the read/write helpers
 * for network calls to move this to a real backend; the exported signatures
 * are what Kitchen.jsx and Library.jsx depend on.
 */
const STORAGE_KEY = 'cc_designs'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // Storage full or unavailable — designs are best-effort, same as premium.js
  }
}

function generateId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * @param {string} [sort] field name, `-` prefix for descending
 * @param {number} [limit]
 */
export async function list(sort = '-created_date', limit = 50) {
  const rows = readAll()
  const descending = sort.startsWith('-')
  const field = descending ? sort.slice(1) : sort
  const sorted = [...rows].sort((a, b) => {
    const left = a?.[field] ?? ''
    const right = b?.[field] ?? ''
    if (left === right) return 0
    return (left < right ? -1 : 1) * (descending ? -1 : 1)
  })
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

export async function create(design) {
  const row = {
    ...design,
    id: design?.id ?? generateId(),
    created_date: design?.created_date ?? new Date().toISOString(),
  }
  writeAll([...readAll(), row])
  return row
}

export async function update(id, patch) {
  const rows = readAll()
  const index = rows.findIndex(row => row.id === id)
  if (index === -1) throw new Error(`Design ${id} not found`)
  const updated = { ...rows[index], ...patch, id: rows[index].id }
  rows[index] = updated
  writeAll(rows)
  return updated
}

export async function remove(id) {
  writeAll(readAll().filter(row => row.id !== id))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- designs.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/adapters/designs.js src/lib/adapters/designs.test.js
git commit -m "feat: add localStorage designs adapter replacing CrayonDesign"
```

---

## Task 4: Vision and consent stubs

**Files:**
- Create: `src/lib/adapters/vision.js`, `src/lib/adapters/consent.js`
- Test: `src/lib/adapters/stubs.test.js`

**Interfaces:**
- Consumes: `NotImplementedError` from Task 2
- Produces:
  - `verifyCrayonPhoto(file, {type, color}) → Promise<{matched: boolean}>` — throws
  - `fetchConsentInfo(handle) → Promise<object>` — throws
  - `grantConsent(payload) → Promise<object>` — throws

- [ ] **Step 1: Write the failing test**

```js
// src/lib/adapters/stubs.test.js
import { describe, it, expect } from 'vitest'
import { NotImplementedError } from '@/lib/adapters/errors'
import { verifyCrayonPhoto } from '@/lib/adapters/vision'
import { fetchConsentInfo, grantConsent } from '@/lib/adapters/consent'

describe('vision adapter', () => {
  it('rejects with NotImplementedError', async () => {
    const file = new File(['x'], 'crayon.png', { type: 'image/png' })
    await expect(verifyCrayonPhoto(file, { type: 'butterfly', color: '#A855F7' }))
      .rejects.toThrow(NotImplementedError)
  })

  it('names itself so Library can surface the reason', async () => {
    const file = new File(['x'], 'crayon.png', { type: 'image/png' })
    await expect(verifyCrayonPhoto(file, { type: 'lion', color: '#F97316' }))
      .rejects.toThrow('verifyCrayonPhoto')
  })
})

describe('consent adapter', () => {
  it('rejects fetchConsentInfo', async () => {
    await expect(fetchConsentInfo('handle')).rejects.toThrow(NotImplementedError)
  })

  it('rejects grantConsent', async () => {
    await expect(grantConsent({ handle: 'h' })).rejects.toThrow(NotImplementedError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stubs.test.js`
Expected: FAIL — cannot resolve `@/lib/adapters/vision`

- [ ] **Step 3: Write `vision.js`**

```js
/**
 * Crayon photo verification.
 *
 * Replaces base44.integrations.Core.UploadFile + InvokeLLM, which verified that
 * a photo showed a physical collectible crayon of a given shape and colour.
 * This is the anti-cheat for the collectibles mechanic, so it must run
 * server-side with a real vision model — never from the browser with an API key.
 *
 * @param {File} file photo from the device camera
 * @param {{type: string, color: string}} target expected crayon shape and colour
 * @returns {Promise<{matched: boolean}>}
 */
import { NotImplementedError } from './errors'

export async function verifyCrayonPhoto(file, target) {
  void file; void target
  throw new NotImplementedError('verifyCrayonPhoto')
}
```

- [ ] **Step 4: Write `consent.js`**

```js
/**
 * OAuth/MCP consent.
 *
 * Replaces base44's /api/apps/{appId}/mcp/consent-info and
 * /api/apps/{appId}/mcp/authorize-grant endpoints. These implemented base44's
 * MCP consent protocol and have no meaning outside that platform; the page is
 * kept so its UI survives for a future equivalent flow.
 */
import { NotImplementedError } from './errors'

/** @param {string} handle opaque consent handle from the query string */
export async function fetchConsentInfo(handle) {
  void handle
  throw new NotImplementedError('fetchConsentInfo')
}

/** @param {object} payload grant decision to record */
export async function grantConsent(payload) {
  void payload
  throw new NotImplementedError('grantConsent')
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- stubs.test.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/adapters/vision.js src/lib/adapters/consent.js src/lib/adapters/stubs.test.js
git commit -m "feat: add stubbed vision and consent adapters"
```

---

## Task 5: Button without cva or Radix Slot

**Files:**
- Modify: `src/components/ui/button.jsx`
- Test: `src/components/ui/button.test.jsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`
- Produces: `Button` (default export absent — named only) and `buttonVariants({variant, size, className}) → string`. Both names are unchanged from the baseline.

`asChild` is used nowhere in the app, so `@radix-ui/react-slot` is dropped rather than reimplemented.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/ui/button.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from '@/components/ui/button'

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'

const VARIANTS = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

const SIZES = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8',
  icon: 'h-9 w-9',
}

describe('Button class parity', () => {
  it.each(Object.entries(VARIANTS))('variant %s keeps its baseline classes', (variant, expected) => {
    const result = buttonVariants({ variant })
    for (const token of `${BASE} ${expected}`.split(' ')) {
      expect(result.split(' ')).toContain(token)
    }
  })

  it.each(Object.entries(SIZES))('size %s keeps its baseline classes', (size, expected) => {
    // `sm` and `lg` re-declare rounded-md, which tailwind-merge collapses; check
    // the size-defining tokens survive.
    const result = buttonVariants({ size })
    for (const token of expected.split(' ')) {
      expect(result.split(' ')).toContain(token)
    }
  })

  it('defaults to the default variant and size', () => {
    expect(buttonVariants()).toBe(buttonVariants({ variant: 'default', size: 'default' }))
  })

  it('lets a caller className win over the defaults', () => {
    expect(buttonVariants({ className: 'h-12' }).split(' ')).toContain('h-12')
    expect(buttonVariants({ className: 'h-12' }).split(' ')).not.toContain('h-9')
  })
})

describe('Button rendering', () => {
  it('renders a native button with the variant classes', () => {
    render(<Button variant="outline">Continue with Google</Button>)
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.className).toBe(buttonVariants({ variant: 'outline' }))
  })

  it('forwards type, disabled and onClick', async () => {
    render(<Button type="submit" disabled>Log in</Button>)
    const button = screen.getByRole('button', { name: 'Log in' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('merges a caller className', () => {
    render(<Button className="w-full h-12 font-medium">Log in</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- button.test.jsx`
Expected: FAIL — resolving `@radix-ui/react-slot` and `class-variance-authority`, which are not installed

- [ ] **Step 3: Rewrite `button.jsx`**

```jsx
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"

const buttonVariantClasses = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  outline:
    "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
}

const buttonSizeClasses = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
}

function buttonVariants({ variant = "default", size = "default", className } = {}) {
  return cn(
    buttonBase,
    buttonVariantClasses[variant] ?? buttonVariantClasses.default,
    buttonSizeClasses[size] ?? buttonSizeClasses.default,
    className
  )
}

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- button.test.jsx`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.jsx src/components/ui/button.test.jsx
git commit -m "refactor: rewrite Button without cva or Radix Slot

Class strings copied verbatim from the baseline; tests assert every
variant and size token survives."
```

---

## Task 6: Label and the authored Input

**Files:**
- Modify: `src/components/ui/label.jsx`
- Create (replacing the OTP duplicate): `src/components/ui/input.jsx`
- Test: `src/components/ui/label.test.jsx`, `src/components/ui/input.test.jsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`
- Produces: `Label` (named export), `Input` (named export). Both are `React.forwardRef` components spreading all props onto a native element.

`src/components/ui/input.jsx` currently contains a byte-identical copy of `input-otp.jsx` and exports no `Input`, which is why four auth pages crash. Overwrite it completely.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/components/ui/label.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '@/components/ui/label'

const BASELINE = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

describe('Label', () => {
  it('renders a native label with the baseline classes', () => {
    render(<Label htmlFor="email">Email</Label>)
    const label = screen.getByText('Email')
    expect(label.tagName).toBe('LABEL')
    expect(label.className).toBe(BASELINE)
  })

  it('associates with its control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('merges a caller className', () => {
    render(<Label htmlFor="a" className="mb-2">Email</Label>)
    expect(screen.getByText('Email').className).toContain('mb-2')
  })
})
```

```jsx
// src/components/ui/input.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders a native input', () => {
    render(<Input placeholder="you@example.com" />)
    expect(screen.getByPlaceholderText('you@example.com').tagName).toBe('INPUT')
  })

  it('carries the design-system classes', () => {
    render(<Input placeholder="x" />)
    const className = screen.getByPlaceholderText('x').className
    for (const token of ['flex', 'h-9', 'w-full', 'rounded-md', 'border', 'border-input', 'bg-transparent', 'px-3', 'py-1', 'shadow-sm', 'focus-visible:ring-1', 'focus-visible:ring-ring']) {
      expect(className.split(' ')).toContain(token)
    }
  })

  it('lets the auth pages override height and padding', () => {
    render(<Input placeholder="x" className="pl-10 h-12" />)
    const tokens = screen.getByPlaceholderText('x').className.split(' ')
    expect(tokens).toContain('h-12')
    expect(tokens).toContain('pl-10')
    expect(tokens).not.toContain('h-9')
  })

  it('forwards type, autoComplete and required', () => {
    render(<Input type="email" autoComplete="email" required placeholder="x" />)
    const input = screen.getByPlaceholderText('x')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
    expect(input).toBeRequired()
  })

  it('is controllable', async () => {
    const user = userEvent.setup()
    let value = ''
    const { rerender } = render(
      <Input placeholder="x" value={value} onChange={e => { value = e.target.value }} />
    )
    await user.type(screen.getByPlaceholderText('x'), 'a')
    rerender(<Input placeholder="x" value={value} onChange={() => {}} />)
    expect(screen.getByPlaceholderText('x')).toHaveValue('a')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- label.test.jsx input.test.jsx`
Expected: FAIL — `label.jsx` resolves `@radix-ui/react-label`; `input.jsx` exports no `Input`

- [ ] **Step 3: Rewrite `label.jsx`**

```jsx
"use client";
import * as React from "react"

import { cn } from "@/lib/utils"

const labelClasses =
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(labelClasses, className)} {...props} />
))
Label.displayName = "Label"

export { Label }
```

- [ ] **Step 4: Write `input.jsx`**

```jsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- label.test.jsx input.test.jsx`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/label.jsx src/components/ui/input.jsx src/components/ui/label.test.jsx src/components/ui/input.test.jsx
git commit -m "refactor: plain Label, and author the missing Input

input.jsx was a byte-identical copy of input-otp.jsx and exported no
Input, crashing Login, Register, ForgotPassword and ResetPassword."
```

---

## Task 7: Hand-written OTP input

The highest-risk task. The DOM and classes must match the baseline exactly, and seven behaviours must survive dropping the `input-otp` package.

**Files:**
- Modify: `src/components/ui/input-otp.jsx`
- Test: `src/components/ui/input-otp.test.jsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`
- Produces: `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator` — same four named exports as the baseline. `InputOTP` accepts `maxLength`, `value`, `onChange`, `autoFocus`, `autoComplete`, `containerClassName`, `className`. `InputOTPSlot` accepts `index`.

Used by `Register.jsx:86-101` as six `InputOTPSlot`s inside one `InputOTPGroup`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/ui/input-otp.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

const SLOT_CLASSES =
  'relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md'

function Harness({ onChange = () => {}, ...props }) {
  const [value, setValue] = React.useState('')
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={next => { setValue(next); onChange(next) }}
      autoFocus
      autoComplete="one-time-code"
      {...props}
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} data-testid={`slot-${i}`} />)}
      </InputOTPGroup>
    </InputOTP>
  )
}

const input = () => document.querySelector('input')

describe('OTP structure parity', () => {
  it('renders six slots carrying the baseline classes', () => {
    render(<Harness />)
    for (let i = 0; i < 6; i++) {
      const slot = screen.getByTestId(`slot-${i}`)
      for (const token of SLOT_CLASSES.split(' ')) {
        expect(slot.className.split(' ')).toContain(token)
      }
    }
  })

  it('gives the container its baseline classes', () => {
    const { container } = render(<Harness />)
    const tokens = container.firstChild.className.split(' ')
    for (const token of ['flex', 'items-center', 'gap-2', 'has-[:disabled]:opacity-50']) {
      expect(tokens).toContain(token)
    }
  })

  it('exposes one real input carrying the OTP attributes', () => {
    render(<Harness />)
    expect(input()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(input()).toHaveAttribute('maxlength', '6')
    expect(input()).toHaveAttribute('inputmode', 'numeric')
  })
})

describe('OTP behaviour', () => {
  it('typing fills slots left to right', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '123')
    expect(screen.getByTestId('slot-0')).toHaveTextContent('1')
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2')
    expect(screen.getByTestId('slot-2')).toHaveTextContent('3')
    expect(screen.getByTestId('slot-3')).toHaveTextContent('')
  })

  it('reports each change to onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(input(), '12')
    expect(onChange).toHaveBeenLastCalledWith('12')
  })

  it('backspace clears the last digit', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '123')
    await user.type(input(), '{backspace}')
    expect(screen.getByTestId('slot-2')).toHaveTextContent('')
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2')
  })

  it('rejects non-digits', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), 'a1b2')
    expect(screen.getByTestId('slot-0')).toHaveTextContent('1')
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2')
  })

  it('stops at maxLength', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(input(), '1234567890')
    expect(onChange).toHaveBeenLastCalledWith('123456')
  })

  it('paste fills every slot', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    input().focus()
    await user.paste('654321')
    expect(screen.getByTestId('slot-0')).toHaveTextContent('6')
    expect(screen.getByTestId('slot-5')).toHaveTextContent('1')
  })

  it('marks the caret slot active and the rest inactive', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '12')
    expect(screen.getByTestId('slot-2').className).toContain('ring-1')
    expect(screen.getByTestId('slot-0').className).not.toContain('ring-1')
  })

  it('shows the fake caret only in the active empty slot', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '1')
    expect(screen.getByTestId('slot-1').querySelector('.animate-caret-blink')).toBeTruthy()
    expect(screen.getByTestId('slot-0').querySelector('.animate-caret-blink')).toBeFalsy()
  })

  it('drops the active ring on blur', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '1')
    await user.tab()
    expect(screen.getByTestId('slot-1').className).not.toContain('ring-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- input-otp.test.jsx`
Expected: FAIL — cannot resolve `input-otp`

- [ ] **Step 3: Rewrite `input-otp.jsx`**

```jsx
import * as React from "react"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTPContext = React.createContext({ slots: [] })

const InputOTP = React.forwardRef((
  {
    className,
    containerClassName,
    maxLength = 6,
    value = "",
    onChange,
    children,
    ...props
  },
  ref
) => {
  const innerRef = React.useRef(null)
  const [isFocused, setIsFocused] = React.useState(false)
  const [caret, setCaret] = React.useState(0)

  React.useImperativeHandle(ref, () => innerRef.current)

  // The caret can sit one past the last digit, but never past the final slot.
  const clampCaret = (position) =>
    Math.max(0, Math.min(position ?? 0, maxLength - 1))

  const syncCaret = () => setCaret(clampCaret(innerRef.current?.selectionStart))

  const handleChange = (event) => {
    const next = event.target.value.replace(/\D/g, "").slice(0, maxLength)
    onChange?.(next)
    // Selection lands after the last accepted digit.
    requestAnimationFrame(() => setCaret(clampCaret(next.length)))
  }

  const slots = Array.from({ length: maxLength }, (_, index) => {
    const char = value[index] ?? null
    const isActive = isFocused && index === clampCaret(Math.min(value.length, caret))
    return { char, isActive, hasFakeCaret: isActive && char === null }
  })

  return (
    <InputOTPContext.Provider value={{ slots }}>
      <div className={cn("relative flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}>
        {children}
        <input
          ref={innerRef}
          value={value}
          onChange={handleChange}
          onSelect={syncCaret}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onFocus={() => { setIsFocused(true); syncCaret() }}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          inputMode="numeric"
          pattern="[0-9]*"
          className={cn(
            "absolute inset-0 h-full w-full cursor-default bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed",
            className
          )}
          {...props} />
      </div>
    </InputOTPContext.Provider>
  );
})
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(InputOTPContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] ?? {}

  return (
    (<div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...props}>
      {char}
      {hasFakeCaret && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>)
  );
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
```

Notes on parity: the container gains `relative` so the overlaid input can be absolutely positioned. `relative` does not affect a static-positioned flex container's layout, so rendering is unchanged. `animate-caret-blink` is preserved and stays inert, exactly as in the baseline.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- input-otp.test.jsx`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input-otp.jsx src/components/ui/input-otp.test.jsx
git commit -m "refactor: hand-write the OTP input, dropping input-otp

Same DOM and class strings; a single overlaid native input drives slot
state so paste, arrows, backspace and one-time-code autofill keep working."
```

---

## Task 8: Toast without cva

**Files:**
- Modify: `src/components/ui/toast.jsx`
- Test: `src/components/ui/toast.test.jsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`
- Produces: `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction` — unchanged names, consumed by `toaster.jsx`, which is **not** modified.

`use-toast.jsx` and `toaster.jsx` stay untouched — both are already dependency-free.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/ui/toast.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastProvider } from '@/components/ui/toast'

const TOAST_BASE_TOKENS = [
  'group', 'pointer-events-auto', 'relative', 'flex', 'w-full', 'items-center',
  'justify-between', 'space-x-4', 'overflow-hidden', 'rounded-md', 'border',
  'p-6', 'pr-8', 'shadow-lg', 'transition-all',
  'data-[state=open]:animate-in', 'data-[state=closed]:animate-out',
  'data-[state=closed]:slide-out-to-right-full',
]

describe('Toast class parity', () => {
  it('keeps the baseline base classes', () => {
    render(<Toast data-testid="toast" />)
    const tokens = screen.getByTestId('toast').className.split(' ')
    for (const token of TOAST_BASE_TOKENS) expect(tokens).toContain(token)
  })

  it('applies the default variant', () => {
    render(<Toast data-testid="toast" />)
    const tokens = screen.getByTestId('toast').className.split(' ')
    for (const token of ['bg-background', 'text-foreground']) expect(tokens).toContain(token)
  })

  it('applies the destructive variant', () => {
    render(<Toast variant="destructive" data-testid="toast" />)
    const tokens = screen.getByTestId('toast').className.split(' ')
    for (const token of ['destructive', 'group', 'border-destructive', 'bg-destructive', 'text-destructive-foreground']) {
      expect(tokens).toContain(token)
    }
  })

  it('keeps the fixed viewport container classes', () => {
    render(<ToastProvider data-testid="provider" />)
    const tokens = screen.getByTestId('provider').className.split(' ')
    for (const token of ['fixed', 'top-0', 'z-[100]', 'flex', 'max-h-screen', 'w-full', 'flex-col-reverse', 'p-4', 'md:max-w-[420px]']) {
      expect(tokens).toContain(token)
    }
  })

  it('renders title and description with their classes', () => {
    render(
      <Toast>
        <ToastTitle>Check your email</ToastTitle>
        <ToastDescription>We sent a code.</ToastDescription>
      </Toast>
    )
    expect(screen.getByText('Check your email').className).toBe('text-sm font-semibold')
    expect(screen.getByText('We sent a code.').className).toBe('text-sm opacity-90')
  })

  it('keeps the toast-close attribute the eslint config whitelists', () => {
    render(<ToastClose data-testid="close" />)
    expect(screen.getByTestId('close')).toHaveAttribute('toast-close')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- toast.test.jsx`
Expected: FAIL — cannot resolve `class-variance-authority`

- [ ] **Step 3: Rewrite the variant machinery in `toast.jsx`**

Replace the `import { cva } from "class-variance-authority";` line and the `toastVariants` block with the following, leaving every other line of the file untouched:

```jsx
const toastBase =
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"

const toastVariantClasses = {
  default: "border bg-background text-foreground",
  destructive:
    "destructive group border-destructive bg-destructive text-destructive-foreground",
}

function toastVariants({ variant = "default" } = {}) {
  return cn(toastBase, toastVariantClasses[variant] ?? toastVariantClasses.default)
}
```

The existing `Toast` component already calls `cn(toastVariants({ variant }), className)`, so it needs no change.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- toast.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/toast.jsx src/components/ui/toast.test.jsx
git commit -m "refactor: drop cva from Toast, keeping class strings verbatim"
```

---

## Task 9: AuthContext and PageNotFound

**Files:**
- Modify: `src/lib/AuthContext.jsx`, `src/lib/PageNotFound.jsx`
- Test: `src/lib/AuthContext.test.jsx`

**Interfaces:**
- Consumes: `getCurrentUser`, `signOut`, `redirectToLogin` from `@/lib/adapters/auth`
- Produces: `AuthProvider`, `useAuth`. The context value keeps every key the baseline exposed: `user`, `isAuthenticated`, `isLoadingAuth`, `isLoadingPublicSettings`, `authError`, `appPublicSettings`, `authChecked`, `logout`, `navigateToLogin`, `checkUserAuth`, `checkAppState`.

`App.jsx`, `ProtextedRoute.jsx` and `UserNotRegisteredError.jsx` consume this and must not need edits.

- [ ] **Step 1: Write the failing test**

```jsx
// src/lib/AuthContext.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/AuthContext'

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="loading-auth">{String(auth.isLoadingAuth)}</span>
      <span data-testid="loading-settings">{String(auth.isLoadingPublicSettings)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="checked">{String(auth.authChecked)}</span>
      <span data-testid="error">{auth.authError ? auth.authError.type : 'none'}</span>
      <span data-testid="keys">{Object.keys(auth).sort().join(',')}</span>
    </div>
  )
}

describe('AuthProvider with a stubbed adapter', () => {
  it('settles to signed-out rather than an error state', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('loading-auth')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('loading-settings')).toHaveTextContent('false')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('checked')).toHaveTextContent('true')
    expect(screen.getByTestId('error')).toHaveTextContent('none')
  })

  it('keeps the context shape App.jsx and ProtextedRoute.jsx rely on', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('keys')).toHaveTextContent(
        'appPublicSettings,authChecked,authError,checkAppState,checkUserAuth,isAuthenticated,isLoadingAuth,isLoadingPublicSettings,logout,navigateToLogin,user'
      )
    })
  })

  it('throws a clear error when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/useAuth must be used within an AuthProvider/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AuthContext.test.jsx`
Expected: FAIL — cannot resolve `@/api/base44Client`

- [ ] **Step 3: Rewrite `AuthContext.jsx`**

```jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, redirectToLogin } from '@/lib/adapters/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  // Resolves the current session. A stubbed auth adapter means "signed out",
  // not "broken" — the app must still render its routes.
  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setAuthError(null);
    setIsLoadingPublicSettings(true);
    setAppPublicSettings(null);
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    signOut(shouldRedirect ? window.location.href : undefined).catch(() => {});
  }, []);

  const navigateToLogin = useCallback(() => {
    redirectToLogin(window.location.href).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

- [ ] **Step 4: Update `PageNotFound.jsx`**

Change line 2 from `import { base44 } from '@/api/base44Client';` to:

```jsx
import { getCurrentUser } from '@/lib/adapters/auth';
```

and inside the `queryFn`, change `const user = await base44.auth.me();` to:

```jsx
const user = await getCurrentUser();
```

No other line changes. The surrounding `try/catch` already returns `{ user: null, isAuthenticated: false }` on failure.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites

- [ ] **Step 6: Commit**

```bash
git add src/lib/AuthContext.jsx src/lib/PageNotFound.jsx src/lib/AuthContext.test.jsx
git commit -m "refactor: point AuthContext and PageNotFound at the auth adapter

Drops base44's app-public-settings call and appParams token handling.
A stubbed adapter resolves to signed-out so routes still render."
```

---

## Task 10: Auth page call sites and routes

**Files:**
- Modify: `src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx`, `src/pages/OAuthConsent.jsx`, `src/App.jsx`
- Test: `src/pages/auth-pages.test.jsx`

**Interfaces:**
- Consumes: every export of `@/lib/adapters/auth` (Task 2), `fetchConsentInfo` and `grantConsent` from `@/lib/adapters/consent` (Task 4)
- Produces: routes `/login`, `/register`, `/forgot-password`, `/reset-password`, `/oauth-consent`

**Only imports and call expressions change. No JSX, no classes, no copy.**

Exact substitutions:

| File | From | To |
| --- | --- | --- |
| `Login.jsx` | `base44.auth.loginViaEmailPassword(email, password)` | `signIn({ email, password })` |
| `Login.jsx` | `base44.auth.loginWithProvider("google", "/")` | `signInWithProvider("google", "/")` |
| `Register.jsx` | `base44.auth.register({ email, password })` | `signUp({ email, password })` |
| `Register.jsx` | `base44.auth.verifyOtp({ email, otpCode })` | `verifyOtp({ email, code: otpCode })` |
| `Register.jsx` | `result.access_token` | `result.accessToken` |
| `Register.jsx` | `base44.auth.setToken(...)` | `setToken(...)` |
| `Register.jsx` | `base44.auth.resendOtp(email)` | `resendOtp(email)` |
| `Register.jsx` | `base44.auth.loginWithProvider("google", "/")` | `signInWithProvider("google", "/")` |
| `ForgotPassword.jsx` | `base44.auth.resetPasswordRequest(email)` | `requestPasswordReset(email)` |
| `ResetPassword.jsx` | `base44.auth.resetPassword({ resetToken, newPassword })` | `resetPassword({ token: resetToken, newPassword })` |
| `OAuthConsent.jsx` | `fetch(\`/api/apps/${appParams.appId}/mcp/consent-info?handle=...\`)` | `fetchConsentInfo(ctx)` |
| `OAuthConsent.jsx` | `fetch(\`/api/apps/${appParams.appId}/mcp/authorize-grant\`, ...)` | `grantConsent(payload)` |

`OAuthConsent.jsx` also drops `import { appParams } from "@/lib/app-params";` and the two `Authorization` header lines that referenced `appParams.token`, since the adapter owns transport now.

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/auth-pages.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Login', () => {
  it('renders without crashing now that Input exists', () => {
    wrap(<Login />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('keeps its Google button and divider copy', () => {
    wrap(<Login />)
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument()
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('surfaces the stub message in the error banner instead of throwing', async () => {
    const user = userEvent.setup()
    wrap(<Login />)
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => {
      expect(screen.getByText(/needs a backend/)).toBeInTheDocument()
    })
  })
})

describe('ForgotPassword', () => {
  it('renders and surfaces the stub message', async () => {
    const user = userEvent.setup()
    wrap(<ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.click(screen.getByRole('button', { name: /Send/i }))
    await waitFor(() => {
      expect(screen.getByText(/needs a backend/)).toBeInTheDocument()
    })
  })
})
```

If `ForgotPassword.jsx`'s submit button label differs from `/Send/i`, read the file and use its actual label rather than changing the page.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth-pages.test.jsx`
Expected: FAIL — cannot resolve `@/api/base44Client`

- [ ] **Step 3: Apply the substitutions**

Work through the table above file by file. In each file replace the `import { base44 } from "@/api/base44Client";` line with a named import from `@/lib/adapters/auth` listing only the functions that file uses. Example for `Login.jsx`:

```jsx
import { signIn, signInWithProvider } from "@/lib/adapters/auth";
```

`handleSubmit` becomes:

```jsx
    try {
      await signIn({ email, password });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
```

and `handleGoogle`:

```jsx
  const handleGoogle = () => {
    signInWithProvider("google", "/").catch((err) => setError(err.message));
  };
```

- [ ] **Step 4: Add the routes to `App.jsx`**

Add these imports beside the existing page imports:

```jsx
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthConsent from './pages/OAuthConsent';
```

and these routes inside `<Routes>`, before the `path="*"` catch-all and outside the `AppLayout` route so the auth pages keep their own `AuthLayout`:

```jsx
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites

- [ ] **Step 6: Commit**

```bash
git add src/pages/Login.jsx src/pages/Register.jsx src/pages/ForgotPassword.jsx src/pages/ResetPassword.jsx src/pages/OAuthConsent.jsx src/App.jsx src/pages/auth-pages.test.jsx
git commit -m "refactor: point auth pages at the auth adapter and route them

The five auth pages were unreachable: base44 hosted those flows outside
the app, so App.jsx never routed them."
```

---

## Task 11: Kitchen and Library call sites

**Files:**
- Modify: `src/pages/Kitchen.jsx`, `src/pages/Library.jsx`
- Test: `src/pages/designs-flow.test.jsx`

**Interfaces:**
- Consumes: `create`, `list`, `update`, `remove` from `@/lib/adapters/designs` (Task 3); `verifyCrayonPhoto` from `@/lib/adapters/vision` (Task 4)
- Produces: nothing later tasks depend on

Substitutions — again, imports and call expressions only:

| File | From | To |
| --- | --- | --- |
| `Kitchen.jsx:118` | `base44.entities.CrayonDesign.create({...})` | `createDesign({...})` |
| `Library.jsx:130,155` | `base44.entities.CrayonDesign.list('-created_date', 50)` | `listDesigns('-created_date', 50)` |
| `Library.jsx:171` | `base44.entities.CrayonDesign.delete(deleteTarget.id)` | `removeDesign(deleteTarget.id)` |
| `Library.jsx:288` | `base44.entities.CrayonDesign.update(design.id, {...})` | `updateDesign(design.id, {...})` |
| `Library.jsx:391-396` | `UploadFile` + `InvokeLLM` pair | `verifyCrayonPhoto(file, { type: crayon.type, color: crayon.colors[0] })` |

Import aliases keep the call sites readable:

```jsx
// Kitchen.jsx
import { create as createDesign } from '@/lib/adapters/designs';

// Library.jsx
import { list as listDesigns, update as updateDesign, remove as removeDesign } from '@/lib/adapters/designs';
import { verifyCrayonPhoto } from '@/lib/adapters/vision';
```

The scan handler's body becomes:

```jsx
      const { matched } = await verifyCrayonPhoto(file, {
        type: crayon.type,
        color: crayon.colors[0],
      });
      if (matched) {
```

with the rest of the block — the `cc_collected` update, the success and failure results, the `catch` — unchanged. The existing `catch` already sets a failure result, so the stub surfaces as "didn't match".

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/designs-flow.test.jsx
import { describe, it, expect } from 'vitest'
import { create, list } from '@/lib/adapters/designs'

describe('Kitchen to Library round trip', () => {
  it('a saved design appears in the Library listing', async () => {
    await create({
      name: 'My Crayon Design',
      colors: ['#EF4444', '#3B82F6'],
      heights: [0.5, 0.5],
      shape: 'crayon',
    })
    const rows = await list('-created_date', 50)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('My Crayon Design')
    expect(rows[0].colors).toEqual(['#EF4444', '#3B82F6'])
    expect(rows[0].shape).toBe('crayon')
  })

  it('a competition entry update survives a reload', async () => {
    const saved = await create({ name: 'Sunset' })
    const { update } = await import('@/lib/adapters/designs')
    await update(saved.id, { is_competition_entry: true, competition_email: 'a@b.c' })
    const [row] = await list('-created_date', 50)
    expect(row.is_competition_entry).toBe(true)
    expect(row.competition_email).toBe('a@b.c')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- designs-flow.test.jsx`
Expected: PASS for the adapter itself. The real gate is Step 4 — the pages must stop importing base44.

- [ ] **Step 3: Apply the substitutions**

Edit both pages per the table. Remove `import { base44 } from '@/api/base44Client';` from each.

- [ ] **Step 4: Verify no base44 imports remain in pages**

Run: `grep -rn "base44" src/pages/ src/lib/ src/components/`
Expected: no output

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all suites

- [ ] **Step 6: Commit**

```bash
git add src/pages/Kitchen.jsx src/pages/Library.jsx src/pages/designs-flow.test.jsx
git commit -m "refactor: point Kitchen and Library at the designs and vision adapters"
```

---

## Task 12: Deletions, Tailwind cleanup, and first green build

The task that makes `npm run build` pass.

**Files:**
- Delete: 43 `ui/` components, `src/hooks/use-size.jsx`, `src/hooks/use-mobile.jsx`, `components.json`, `src/lib/app-params.js`
- Modify: `tailwind.config.js`, `src/pages/ColouringLab.jsx`
- Test: `src/test/no-linkage.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1–11
- Produces: a building app

- [ ] **Step 1: Write the failing test**

```js
// src/test/no-linkage.test.js
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.(jsx?|ts)$/.test(entry)) files.push(full)
  }
  return files
}

const SOURCES = walk('src').filter(f => !f.includes('no-linkage.test'))

describe('no base44 or shadcn linkage', () => {
  it.each(['base44', '@radix-ui', 'class-variance-authority', 'from "input-otp"', "from 'input-otp'"])(
    'no source file mentions %s',
    (needle) => {
      const offenders = SOURCES.filter(f => readFileSync(f, 'utf8').includes(needle))
      expect(offenders).toEqual([])
    }
  )

  it('the deleted shadcn components are gone', () => {
    const deleted = [
      'accordion', 'alert-dialog', 'alert', 'aspect-ratio', 'avatar', 'badge',
      'breadcrumb', 'calendar', 'card', 'carousel', 'chart', 'checkbox',
      'collapsible', 'command', 'context-menu', 'dialog', 'drawer',
      'dropdown-menu', 'form', 'hover-card', 'image', 'menubar',
      'navigation-menu', 'pagination', 'popover', 'progress', 'radio-group',
      'resizable', 'scroll-area', 'select', 'separator', 'sheet', 'sidebar',
      'skeleton', 'slider', 'sonner', 'switch', 'table', 'tabs', 'textarea',
      'toggle-group', 'toggle', 'tooltip',
    ]
    const present = deleted.filter(name => existsSync(`src/components/ui/${name}.jsx`))
    expect(present).toEqual([])
  })

  it('the seven kept components are still present', () => {
    for (const name of ['button', 'input', 'label', 'input-otp', 'toast', 'toaster', 'use-toast']) {
      expect(existsSync(`src/components/ui/${name}.jsx`)).toBe(true)
    }
  })

  it('components.json and app-params.js are gone', () => {
    expect(existsSync('components.json')).toBe(false)
    expect(existsSync('src/lib/app-params.js')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- no-linkage.test.js`
Expected: FAIL — the 43 components still exist

- [ ] **Step 3: Delete the components and support files**

```bash
cd src/components/ui
git rm accordion.jsx alert-dialog.jsx alert.jsx aspect-ratio.jsx avatar.jsx \
  badge.jsx breadcrumb.jsx calendar.jsx card.jsx carousel.jsx chart.jsx \
  checkbox.jsx collapsible.jsx command.jsx context-menu.jsx dialog.jsx \
  drawer.jsx dropdown-menu.jsx form.jsx hover-card.jsx image.jsx menubar.jsx \
  navigation-menu.jsx pagination.jsx popover.jsx progress.jsx radio-group.jsx \
  resizable.jsx scroll-area.jsx select.jsx separator.jsx sheet.jsx sidebar.jsx \
  skeleton.jsx slider.jsx sonner.jsx switch.jsx table.jsx tabs.jsx textarea.jsx \
  toggle-group.jsx toggle.jsx tooltip.jsx
cd ../../..
git rm src/hooks/use-size.jsx src/hooks/use-mobile.jsx components.json src/lib/app-params.js
```

Every one of these is recoverable with `git show 82f659c:<path>`.

- [ ] **Step 4: Replace `ColouringLab.jsx`**

It currently holds a copy of `lib/utils.js` and has no default export, so `/colouring-lab` crashes. Replace the whole file:

```jsx
import React from 'react';

export default function ColouringLab() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-3xl text-purple-600 text-center mb-4">Colouring Lab 🎨</h1>
      <div className="bg-white rounded-3xl p-8 kid-shadow text-center">
        <p className="font-body text-gray-500">This lab is still being set up. Check back soon!</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Convert and trim `tailwind.config.js`**

Change `module.exports = {` to `export default {` (required by `"type": "module"`). Delete the `chart` and `sidebar` entries from `theme.extend.colors` — their CSS variables are not defined in `index.css` and nothing references the classes. Delete the `accordion-down` / `accordion-up` entries from `keyframes` and `animation`. Keep `plugins: [require("tailwindcss-animate")]` — but under ESM `require` is unavailable, so change the top of the file to:

```js
import tailwindcssAnimate from 'tailwindcss-animate'
```

and the bottom to:

```js
  plugins: [tailwindcssAnimate],
}
```

Leave `borderRadius`, the remaining `colors`, `fontFamily` and `darkMode` untouched.

- [ ] **Step 6: Run the full suite and the build**

Run: `npm test && npm run build`
Expected: all tests PASS and the build SUCCEEDS. This is the first green build.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: delete 43 unused shadcn components and base44 leftovers

Also converts tailwind.config.js to ESM, drops the chart/sidebar colour
entries whose CSS variables were never defined, and replaces the
ColouringLab file that was a duplicate of lib/utils.js. First green build."
```

---

## Task 13: Manual verification pass

Automated tests cannot confirm visual parity. This task is a human walkthrough.

**Files:** none — verification only

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Walk every route and confirm no console errors**

`/`, `/home`, `/purchase`, `/kitchen`, `/colouring-lab`, `/shop`, `/library`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/oauth-consent`, and a nonsense path for the 404.

- [ ] **Step 3: Confirm visual parity on the pages that rendered before**

Compare Splash, Home, Purchase, Kitchen, Shop and Library against the baseline. To see the baseline: `git stash` any work, `git checkout 82f659c -- src`, screenshot, then `git checkout HEAD -- src`. Class strings were copied verbatim and no page markup changed, so **any visible difference is a bug** — stop and fix it.

- [ ] **Step 4: Exercise the design round trip**

In Kitchen, build a crayon and save it. Confirm it appears in Library, that editing a competition entry persists, and that deleting removes it. Reload between each to confirm `localStorage` persistence.

- [ ] **Step 5: Confirm the collectibles and premium gates still work**

Collectibles shelves read from `cc_collected`; Kitchen and Shop gate on the `cc_*` premium flags. Neither was touched, so both must behave exactly as before. Tapping an uncollected crayon opens the camera and then shows the existing failure state, because `verifyCrayonPhoto` is stubbed.

- [ ] **Step 6: Walk the OTP checklist by hand on `/register`**

Type digits and confirm they advance; backspace and confirm it steps back; arrow keys move the ring; paste a 6-digit code and confirm all six fill; confirm non-digits are rejected; confirm the ring disappears on blur. On a real phone, confirm an SMS code autofills.

- [ ] **Step 7: Confirm zero linkage**

Run: `grep -rn "base44\|@radix-ui\|class-variance-authority\|shadcn" src/ *.js *.json`
Expected: no output.

- [ ] **Step 8: Commit and push**

```bash
git commit --allow-empty -m "chore: verify de-platforming manually

Walked every route, confirmed visual parity against baseline 82f659c,
exercised the design round trip and the OTP checklist."
git push
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| Build prerequisites: rename, package.json, vite.config.js | 1 |
| `auth.js` adapter | 2 |
| `designs.js` adapter | 3 |
| `vision.js`, `consent.js` adapters | 4 |
| Component layer: button | 5 |
| Component layer: label, authored input | 6 |
| Component layer: hand-written OTP | 7 |
| Component layer: toast | 8 |
| `toaster.jsx`, `use-toast.jsx` unchanged | 5–8 (untouched by design) |
| AuthContext rewrite | 9 |
| Routing: five auth routes | 10 |
| Auth page call sites | 10 |
| Kitchen/Library call sites | 11 |
| 47 deletions | 12 |
| tailwind.config.js edits | 12 |
| ColouringLab bug fix | 12 |
| Error handling | 2, 4, 9, 10, 11 |
| Verification | 12 (automated), 13 (manual) |

No gaps.

**Placeholder scan:** no TBD, TODO, "handle edge cases", or "similar to Task N". Every code step carries real code.

**Type consistency:** `NotImplementedError(method)` is defined in Task 2 and used in Tasks 2 and 4. `list/create/update/remove` are defined in Task 3 and consumed under aliases in Task 11. `verifyCrayonPhoto(file, {type, color}) → {matched}` is defined in Task 4 and destructured as `{ matched }` in Task 11. `verifyOtp` returns `{accessToken}` in Task 2 and is read as `result.accessToken` in Task 10. `buttonVariants({variant, size, className})` is defined in Task 5 and unused elsewhere after the Task 12 deletions remove its other callers.
