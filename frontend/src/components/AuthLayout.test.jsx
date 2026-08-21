// The auth pages render outside AppLayout, so they have no header. Without the
// escape hatch below, a visitor redirected here from a protected route has no
// in-app way back — only the browser's Back button.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'

function renderLayout(props = {}) {
  return render(
    <MemoryRouter>
      <AuthLayout icon={KeyRound} title="Welcome back" {...props}>
        <form aria-label="sign in" />
      </AuthLayout>
    </MemoryRouter>,
  )
}

describe('AuthLayout', () => {
  it('offers a way back to Home', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Back to Home/i })).toHaveAttribute(
      'href',
      '/home',
    )
  })

  it('still renders the title and children', () => {
    renderLayout({ subtitle: 'Log in to your account' })
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByText('Log in to your account')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'sign in' })).toBeInTheDocument()
  })
})
