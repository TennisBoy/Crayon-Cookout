// The Cart carries both halves of buying: packs you mean to buy, and passes you
// already own. What it owes its user is a truthful count, a truthful total, and
// an honest answer to "did my purchase go through?".
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Cart from '@/pages/Cart'
import { getCart } from '@/lib/cart'
import { startPreorder } from '@/lib/adapters/billing'

vi.mock('@/lib/adapters/billing', () => ({ startPreorder: vi.fn(() => Promise.resolve()) }))

const seed = (cart) => localStorage.setItem('cc_cart', JSON.stringify(cart))
const renderCart = () => render(<Cart />, { wrapper: MemoryRouter })
const stepper = (name) => screen.getByRole('group', { name: `${name} quantity` })

beforeEach(() => localStorage.clear())

describe('Cart', () => {
  it('invites you to the shop when nothing is in the basket', () => {
    renderCart()
    expect(screen.getByText('No packs in your cart yet!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Browse crayon packs/i })).toHaveAttribute('href', '/purchase')
  })

  it('lists a line for each pack, with its quantity', () => {
    seed({ 'meow-mix-6': 2, 'turtle-time-12': 1 })
    renderCart()

    expect(screen.getByText('Meow Mix 6-pack')).toBeInTheDocument()
    expect(screen.getByText('Turtle Time 12-pack')).toBeInTheDocument()
    expect(within(stepper('Meow Mix 6-pack')).getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('No packs in your cart yet!')).not.toBeInTheDocument()
  })

  it('totals a line by quantity and the basket by line', () => {
    seed({ 'meow-mix-6': 2, 'turtle-time-12': 1 }) // 2.99*2 + 5.49 = 11.47
    renderCart()

    expect(screen.getByText('$5.98')).toBeInTheDocument() // the Meow Mix line
    // The pre-order notice repeats the total, so pin the subtotal row itself
    // rather than "somewhere on the page".
    const subtotalRow = screen.getByText('Subtotal').closest('div')
    expect(within(subtotalRow).getByText('$11.47')).toBeInTheDocument()
  })

  it('counts packs, not lines, in the summary', () => {
    seed({ 'meow-mix-6': 2, 'turtle-time-12': 1 })
    renderCart()
    expect(screen.getByText('3 packs ready to go.')).toBeInTheDocument()
  })

  it('says "pack" rather than "packs" for a single one', () => {
    seed({ 'meow-mix-6': 1 })
    renderCart()
    expect(screen.getByText('1 pack ready to go.')).toBeInTheDocument()
  })

  it('adds and removes one at a time from the line', () => {
    seed({ 'meow-mix-6': 2 })
    renderCart()

    fireEvent.click(screen.getByLabelText('Add one Meow Mix 6-pack'))
    expect(getCart()['meow-mix-6']).toBe(3)

    fireEvent.click(screen.getByLabelText('Remove one Meow Mix 6-pack'))
    expect(getCart()['meow-mix-6']).toBe(2)
  })

  it('drops the line entirely when the last one is removed', () => {
    seed({ 'meow-mix-6': 1 })
    renderCart()

    fireEvent.click(screen.getByLabelText('Remove one Meow Mix 6-pack'))
    expect(getCart()).toEqual({})
    expect(screen.getByText('No packs in your cart yet!')).toBeInTheDocument()
  })

  it('empties a whole line from the bin button', () => {
    seed({ 'meow-mix-6': 4, 'turtle-time-12': 1 })
    renderCart()

    fireEvent.click(screen.getByLabelText('Remove Meow Mix 6-pack from cart'))
    expect(getCart()).toEqual({ 'turtle-time-12': 1 })
  })

  // A basket can outlive the pack it holds; that must not blank the page.
  it('skips a pack that is no longer sold', () => {
    seed({ 'meow-mix-6': 1, 'discontinued-pack': 3 })
    renderCart()

    expect(screen.getByText('Meow Mix 6-pack')).toBeInTheDocument()
    expect(screen.getByText('1 pack ready to go.')).toBeInTheDocument()

    // The subtotal counts the surviving pack only, not the ghost's 3.
    const subtotalRow = screen.getByText('Subtotal').closest('div')
    expect(within(subtotalRow).getByText('$2.99')).toBeInTheDocument()
  })
})

describe('Cart — passes you own', () => {
  const setEntitlements = (features) =>
    localStorage.setItem('cc_entitlements', JSON.stringify(features))

  it('says the pass is not unlocked for a new user', () => {
    renderCart()
    expect(screen.getByText('Not unlocked yet')).toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
  })

  it('marks the pass Active once both features are owned', () => {
    setEntitlements(['kitchen', 'colouring'])
    renderCart()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Not unlocked yet')).not.toBeInTheDocument()
  })

  it('does not call half a purchase Active', () => {
    // The pass grants two features and is sold as one product.
    setEntitlements(['kitchen'])
    renderCart()
    expect(screen.getByText('Not unlocked yet')).toBeInTheDocument()
  })

  it('reads the server-backed cache, not a client-set flag alone', () => {
    setEntitlements(['kitchen', 'colouring'])
    renderCart()
    // Nothing wrote cc_kitchen; ownership came from the entitlements cache.
    expect(localStorage.getItem('cc_kitchen')).toBeNull()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows days remaining while a trial runs', () => {
    localStorage.setItem('cc_trial_expiry', String(Date.now() + 3 * 86400000))
    renderCart()
    expect(screen.getByText(/3 days left/)).toBeInTheDocument()
  })

  it('shows the passes even when the basket is empty', () => {
    renderCart()
    expect(screen.getByText(/No packs in your cart yet/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Your passes/ })).toBeInTheDocument()
  })

  it('still shows the packs alongside them', () => {
    seed({ 'meow-mix-6': 1 })
    renderCart()
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Your passes/ })).toBeInTheDocument()
  })

  it('points at the Shop only while the pass is unowned', () => {
    renderCart()
    expect(screen.getByRole('link', { name: /See what the Shop unlocks/ })).toBeInTheDocument()

    localStorage.clear()
    setEntitlements(['kitchen', 'colouring'])
    renderCart()
    expect(screen.getAllByRole('link', { name: /See what the Shop unlocks/ })).toHaveLength(1)
  })
})

describe('Cart — pre-ordering', () => {
  const answerGate = async () => {
    const input = screen.getByLabelText(/=/)
    const [a, b] = input.labels[0].textContent.match(/\d+/g).map(Number)
    fireEvent.change(input, { target: { value: String(a * b) } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
  }

  it('says plainly that nothing is charged today', () => {
    seed({ 'meow-mix-6': 2, 'turtle-time-12': 1 })
    renderCart()
    expect(screen.getByText(/won't be charged today/i)).toBeInTheDocument()
    expect(screen.getByText(/8 September/)).toBeInTheDocument()
  })

  it('quotes the amount that will be charged later', () => {
    seed({ 'meow-mix-6': 2, 'turtle-time-12': 1 }) // 2.99*2 + 5.49 = 11.47
    renderCart()
    expect(screen.getAllByText(/\$11\.47/).length).toBeGreaterThan(0)
  })

  it('asks a grown-up before starting a pre-order', () => {
    seed({ 'meow-mix-6': 1 })
    renderCart()
    fireEvent.click(screen.getByRole('button', { name: /Pre-order/i }))

    expect(screen.getByRole('dialog', { name: /Grown-up check/i })).toBeInTheDocument()
    expect(startPreorder).not.toHaveBeenCalled()
  })

  it('sends the basket once the check passes', async () => {
    seed({ 'meow-mix-6': 2 })
    renderCart()
    fireEvent.click(screen.getByRole('button', { name: /Pre-order/i }))
    await answerGate()

    expect(startPreorder).toHaveBeenCalledWith({ 'meow-mix-6': 2 })
  })

  it('offers no pre-order at all when the basket is empty', () => {
    renderCart()
    expect(screen.queryByRole('button', { name: /Pre-order/i })).not.toBeInTheDocument()
  })
})
