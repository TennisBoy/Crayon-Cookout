// The Cart answers "did my purchase go through?", so what it must never do is
// claim something is active when it isn't.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const refreshEntitlements = vi.fn(() => Promise.resolve([]))
const state = { features: [], trialActive: false, trialUsed: false, trialDays: 0 }

vi.mock('@/lib/premium', () => ({
  hasFeature: (f) => state.features.includes(f),
  isTrialActive: () => state.trialActive,
  hasTrialUsed: () => state.trialUsed,
  getTrialDaysLeft: () => state.trialDays,
  refreshEntitlements: (...a) => refreshEntitlements(...a),
}))

const Cart = (await import('@/pages/Cart')).default

const renderCart = () => render(<Cart />, { wrapper: MemoryRouter })

beforeEach(() => {
  state.features = []
  state.trialActive = false
  state.trialUsed = false
  state.trialDays = 0
  refreshEntitlements.mockClear()
})

describe('Cart', () => {
  it('shows nothing unlocked for a new user', () => {
    renderCart()
    expect(screen.getByText('Not unlocked yet')).toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  it('marks the pass Active only when BOTH features are owned', () => {
    state.features = ['kitchen'] // half a purchase is not a purchase
    renderCart()
    expect(screen.getByText('Not unlocked yet')).toBeInTheDocument()
  })

  it('marks the pass Active when both are owned', () => {
    state.features = ['kitchen', 'colouring']
    renderCart()
    expect(screen.getAllByText('Active').length).toBe(1)
    expect(screen.queryByText('Not unlocked yet')).not.toBeInTheDocument()
  })

  it('shows days left while a trial runs', () => {
    state.trialActive = true
    state.trialDays = 12
    renderCart()
    expect(screen.getByText(/12 days of full access left/)).toBeInTheDocument()
  })

  it('says the trial is used up once it has been', () => {
    state.trialUsed = true
    renderCart()
    expect(screen.getByText('Used')).toBeInTheDocument()
  })

  it('re-asks the server rather than trusting the cache', () => {
    renderCart()
    expect(refreshEntitlements).toHaveBeenCalled()
  })

  it('offers the Shop only when the pass is not owned', () => {
    renderCart()
    expect(screen.getByRole('link', { name: /Go to the Shop/i })).toHaveAttribute('href', '/shop')

    state.features = ['kitchen', 'colouring']
    renderCart()
    expect(screen.getAllByRole('link', { name: /Go to the Shop/i })).toHaveLength(1)
  })
})
