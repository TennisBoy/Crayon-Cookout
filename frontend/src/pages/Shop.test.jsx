// Buying used to be `localStorage.setItem('cc_kitchen','true')`. These pin the
// two properties that replaced it: the browser grants nothing, and a child
// cannot reach a checkout page by tapping a colourful button.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const startCheckout = vi.fn(() => Promise.resolve())
vi.mock('@/lib/adapters/billing', () => ({ startCheckout: (...a) => startCheckout(...a) }))

const premium = {
  features: [],
  trialActive: false,
  trialUsed: false,
  trialDays: 0,
}
vi.mock('@/lib/premium', () => ({
  hasFeature: (f) => premium.features.includes(f),
  isTrialActive: () => premium.trialActive,
  hasTrialUsed: () => premium.trialUsed,
  getTrialDaysLeft: () => premium.trialDays,
  startTrial: vi.fn(),
  refreshEntitlements: vi.fn(() => Promise.resolve([])),
}))

const Shop = (await import('@/pages/Shop')).default
const renderShop = () => render(<Shop />, { wrapper: MemoryRouter })

beforeEach(() => {
  premium.features = []
  premium.trialActive = false
  premium.trialUsed = false
  startCheckout.mockClear()
  localStorage.clear()
})

describe('Shop purchase flow', () => {
  it('does not start checkout until the grown-up check passes', async () => {
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }))

    expect(screen.getByRole('dialog', { name: /Grown-up check/i })).toBeInTheDocument()
    expect(startCheckout).not.toHaveBeenCalled()
  })

  it('rejects a wrong answer and stays put', async () => {
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }))
    await userEvent.type(screen.getByLabelText(/=/), '1')
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(startCheckout).not.toHaveBeenCalled()
  })

  it('starts checkout once the sum is answered correctly', async () => {
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }))

    // Read the sum off the page rather than assuming it — it is random.
    const label = screen.getByLabelText(/=/).labels[0].textContent
    const [a, b] = label.match(/\d+/g).map(Number)
    await userEvent.type(screen.getByLabelText(/=/), String(a * b))
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => expect(startCheckout).toHaveBeenCalled())
  })

  it('cancelling the gate buys nothing', async () => {
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }))
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(startCheckout).not.toHaveBeenCalled()
  })

  it('never writes an entitlement to localStorage', async () => {
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }))
    const label = screen.getByLabelText(/=/).labels[0].textContent
    const [a, b] = label.match(/\d+/g).map(Number)
    await userEvent.type(screen.getByLabelText(/=/), String(a * b))
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => expect(startCheckout).toHaveBeenCalled())
    expect(localStorage.getItem('cc_kitchen')).toBeNull()
    expect(localStorage.getItem('cc_colouring')).toBeNull()
  })

  it('shows Owned instead of a buy button when the pass is owned', () => {
    premium.features = ['kitchen', 'colouring']
    renderShop()
    expect(screen.getByText('Owned')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Buy Now/i })).not.toBeInTheDocument()
  })

  it('surfaces a checkout failure instead of failing silently', async () => {
    startCheckout.mockRejectedValueOnce(new Error('Purchases are not configured.'))
    renderShop()
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }))
    const label = screen.getByLabelText(/=/).labels[0].textContent
    const [a, b] = label.match(/\d+/g).map(Number)
    await userEvent.type(screen.getByLabelText(/=/), String(a * b))
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }))

    expect(await screen.findByText(/Purchases are not configured/)).toBeInTheDocument()
  })
})
