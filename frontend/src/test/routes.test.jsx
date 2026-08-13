// src/test/routes.test.jsx
//
// Route-render smoke test. Renders the REAL app (src/App.jsx) — real
// BrowserRouter, real AuthProvider, real route table — at each of the app's
// routes and asserts it mounts without throwing, showing something
// distinctive to that route.
//
// Why render <App /> instead of individual page components: this repo has
// had four separate "file is missing or is a copy of the wrong file" bugs
// that crashed a route at render time while `vite build` said nothing. Only
// the real route table (App.jsx composing BrowserRouter + AuthProvider +
// QueryClientProvider + the actual page imports) can catch a miswired
// <Route element=.../> or a page that throws when it's *actually* mounted
// through the router, as opposed to a hand-built harness that might
// accidentally paper over the exact wiring that broke.
//
// The auth adapter is fully stubbed (every method rejects), so AuthContext
// resolves to "signed out" asynchronously. App shows a loading spinner
// first; every assertion below uses `findBy*` (which retries under the
// hood) to wait past that spinner instead of asserting on it.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

// Pushes the target path into jsdom's history before mounting <App />, so
// the real BrowserRouter (which reads window.location) resolves the real
// route table to the page under test.
function renderRoute(path) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

// jsdom does not implement canvas rendering (that requires the optional
// `canvas` npm package, which this repo does not depend on), so
// HTMLCanvasElement.prototype.getContext('2d') returns null in tests even
// though real browsers always return a context here. Kitchen.jsx's mount
// effect calls canvas.getContext('2d').clearRect(...) without a null guard,
// so under plain jsdom /kitchen throws on mount purely as an artifact of
// the missing canvas backend, not a real app bug (see task report for
// detail). Stub just enough of the 2D context for that effect to no-op,
// scoped to this file only — no source file is touched.
let getContextSpy
beforeAll(() => {
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ clearRect: () => {} })
})
afterAll(() => {
  getContextSpy.mockRestore()
})

describe('route rendering smoke test', () => {
  it('/ renders Splash', async () => {
    renderRoute('/')
    expect(await screen.findByText('Crayon Cookout')).toBeInTheDocument()
  })

  it('/home renders Home', async () => {
    renderRoute('/home')
    expect(
      await screen.findByText(/Welcome, young artist/i)
    ).toBeInTheDocument()
  })

  it('/purchase renders Purchase', async () => {
    renderRoute('/purchase')
    expect(
      await screen.findByRole('heading', { name: /Purchase Crayons/i })
    ).toBeInTheDocument()
  })

  it('/kitchen renders Kitchen', async () => {
    renderRoute('/kitchen')
    expect(
      await screen.findByRole('heading', { name: /The Kitchen/i })
    ).toBeInTheDocument()
  })

  it('/colouring-lab renders ColouringLab', async () => {
    renderRoute('/colouring-lab')
    expect(
      await screen.findByRole('heading', { name: /Colouring Lab/i })
    ).toBeInTheDocument()
  })

  it('/shop renders Shop', async () => {
    renderRoute('/shop')
    expect(
      await screen.findByRole('heading', { name: /The Shop/i })
    ).toBeInTheDocument()
  })

  it('/library renders Library', async () => {
    renderRoute('/library')
    expect(
      await screen.findByRole('heading', { name: /Your Library/i })
    ).toBeInTheDocument()
  })

  it('/login renders Login', async () => {
    renderRoute('/login')
    expect(
      await screen.findByRole('heading', { name: 'Welcome back' })
    ).toBeInTheDocument()
  })

  it('/register renders Register', async () => {
    renderRoute('/register')
    expect(
      await screen.findByRole('heading', { name: 'Create your account' })
    ).toBeInTheDocument()
  })

  it('/forgot-password renders ForgotPassword', async () => {
    renderRoute('/forgot-password')
    expect(
      await screen.findByRole('heading', { name: 'Reset password' })
    ).toBeInTheDocument()
  })

  it('/reset-password renders ResetPassword (no token -> invalid-link state)', async () => {
    // With no ?token= in the URL, ResetPassword deliberately short-circuits
    // to its "invalid link" state instead of showing the reset form. That is
    // correct behaviour for this route with no token, not a failure.
    renderRoute('/reset-password')
    expect(
      await screen.findByRole('heading', { name: 'Invalid reset link' })
    ).toBeInTheDocument()
  })

  it('/oauth-consent renders OAuthConsent (stubbed consent adapter -> error state)', async () => {
    // No ?ctx= param means OAuthConsent never even calls the (stubbed,
    // rejecting) consent adapter — it short-circuits straight to its error
    // state. Either way this is the route's real, correct terminal render
    // for a stubbed backend; assert on what it actually shows.
    renderRoute('/oauth-consent')
    expect(
      await screen.findByRole('heading', { name: 'Authorize access' })
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/authorization link is invalid or has expired/i)
    ).toBeInTheDocument()
  })

  it('/no-such-page renders the 404 page', async () => {
    renderRoute('/no-such-page')
    expect(
      await screen.findByRole('heading', { name: 'Page Not Found' })
    ).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
