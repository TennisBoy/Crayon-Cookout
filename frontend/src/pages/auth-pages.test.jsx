import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it("surfaces the server's error message in the banner instead of throwing", async () => {
    // The API answers 401 with its own wording; the page must show that
    // rather than a generic string or an unhandled rejection.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'unauthenticated',
            message: 'That email or password is not correct.',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const user = userEvent.setup()
    wrap(<Login />)
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => {
      expect(
        screen.getByText('That email or password is not correct.'),
      ).toBeInTheDocument()
    })
  })

  it('reports a reachability problem when the network fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const user = userEvent.setup()
    wrap(<Login />)
    await user.type(screen.getByLabelText('Email'), 'a@b.c')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => {
      expect(screen.getByText(/Could not reach the server/)).toBeInTheDocument()
    })
  })
})

describe('ForgotPassword', () => {
  // ForgotPassword deliberately never reveals whether the request succeeded
  // or failed (anti-enumeration): its catch is empty and `finally` always
  // shows the neutral success message. Even when the adapter stub rejects,
  // the page must show that message and must NOT leak the underlying error.
  it('always shows the neutral success message, even when the adapter rejects', async () => {
    const user = userEvent.setup()
    wrap(<ForgotPassword />)
    await user.type(screen.getByLabelText('Email address'), 'a@b.c')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => {
      expect(
        screen.getByText(
          "If an account exists with that email, you'll receive a password reset link shortly."
        )
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(/needs a backend/)).not.toBeInTheDocument()
  })
})
