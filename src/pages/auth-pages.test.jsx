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
