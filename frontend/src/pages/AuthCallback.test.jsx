// The callback page is where a real session materialises out of a URL
// fragment, so its refusals matter as much as its success path.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthCallback from '@/pages/AuthCallback'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

const completeOAuthSession = vi.fn()
vi.mock('@/lib/adapters/auth', () => ({
  completeOAuthSession: (...args) => completeOAuthSession(...args),
}))

function renderAt(url) {
  window.history.pushState({}, '', url)
  return render(<AuthCallback />, { wrapper: MemoryRouter })
}

beforeEach(() => {
  navigate.mockReset()
  completeOAuthSession.mockReset()
  completeOAuthSession.mockResolvedValue(undefined)
})

describe('AuthCallback', () => {
  it('stores the session and lands on the requested page', async () => {
    renderAt('/auth/callback?next=/library#access_token=abc&refresh_token=def')

    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(completeOAuthSession).toHaveBeenCalledWith('#access_token=abc&refresh_token=def')
    expect(navigate).toHaveBeenCalledWith('/library', { replace: true })
  })

  it('replaces history rather than pushing, so Back cannot revisit the fragment', async () => {
    renderAt('/auth/callback?next=/home#access_token=abc')

    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(navigate.mock.calls[0][1]).toEqual({ replace: true })
  })

  it('ignores an absolute next and falls back to /home', async () => {
    renderAt('/auth/callback?next=https://evil.example#access_token=abc')

    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith('/home', { replace: true })
  })

  it('ignores a protocol-relative next', async () => {
    renderAt('/auth/callback?next=//evil.example#access_token=abc')

    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith('/home', { replace: true })
  })

  it('shows the failure instead of redirecting when the handshake failed', async () => {
    completeOAuthSession.mockRejectedValue(new Error('access_denied'))
    renderAt('/auth/callback#error=access_denied')

    expect(await screen.findByText(/did not finish/i)).toBeInTheDocument()
    expect(screen.getByText('access_denied')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
