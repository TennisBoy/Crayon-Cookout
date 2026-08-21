// The header renders on every route behind AppLayout, so its auth-dependent
// bits are worth pinning: a regression here is visible on every page at once.
//
// The auth adapter is stubbed rather than the AuthContext, so this exercises
// the real provider — including the rule that a rejecting getCurrentUser()
// means "signed out", not "broken".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import AppLayout from '@/components/AppLayout'

const getCurrentUser = vi.fn()

vi.mock('@/lib/adapters/auth', () => ({
  getCurrentUser: (...args) => getCurrentUser(...args),
  signOut: vi.fn(() => Promise.resolve()),
  redirectToLogin: vi.fn(() => Promise.resolve()),
}))

function renderHeader() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  getCurrentUser.mockReset()
})

describe('AppLayout header', () => {
  it('offers Sign In when signed out', async () => {
    getCurrentUser.mockRejectedValue(new Error('no session'))
    renderHeader()

    const signIn = await screen.findByRole('link', { name: /Sign In/i })
    expect(signIn).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: /Sign Out/i })).not.toBeInTheDocument()
  })

  it('offers Sign Out when signed in', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1', email: 'kid@example.com' })
    renderHeader()

    expect(await screen.findByRole('button', { name: /Sign Out/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Sign In/i })).not.toBeInTheDocument()
  })

  it('offers the Cart to the left of Library', async () => {
    getCurrentUser.mockRejectedValue(new Error('no session'))
    renderHeader()

    await screen.findByRole('link', { name: /Sign In/i })
    const cart = screen.getByRole('link', { name: /Cart/i })
    const library = screen.getByRole('link', { name: /Library/i })
    expect(cart).toHaveAttribute('href', '/cart')
    // DOCUMENT_POSITION_FOLLOWING: library comes after cart in the DOM, which
    // is what puts it to the right in a flex row.
    expect(cart.compareDocumentPosition(library) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the Cart whether signed in or out', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1', email: 'kid@example.com' })
    renderHeader()

    await screen.findByRole('button', { name: /Sign Out/i })
    expect(screen.getByRole('link', { name: /Cart/i })).toHaveAttribute('href', '/cart')
  })

  it('keeps the Library link alongside the auth control', async () => {
    getCurrentUser.mockRejectedValue(new Error('no session'))
    renderHeader()

    await screen.findByRole('link', { name: /Sign In/i })
    expect(screen.getByRole('link', { name: /Library/i })).toHaveAttribute('href', '/library')
  })

  it('shows neither control while auth is still resolving', () => {
    // A never-settling promise holds AuthContext in its loading state.
    getCurrentUser.mockReturnValue(new Promise(() => {}))
    renderHeader()

    expect(screen.queryByRole('link', { name: /Sign In/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sign Out/i })).not.toBeInTheDocument()
  })
})
