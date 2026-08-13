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
