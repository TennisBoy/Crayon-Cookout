// The shelf has to agree with the basket in both directions: adding here shows
// up in cc_cart, and a basket changed elsewhere shows up here.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import Purchase from '@/pages/Purchase'
import { getCart, setQty } from '@/lib/cart'

const renderPurchase = () => render(<Purchase />)
const stepper = (name) => screen.getByRole('group', { name: `${name} quantity` })

beforeEach(() => localStorage.clear())

describe('Purchase', () => {
  it('starts every pack at zero', () => {
    renderPurchase()
    expect(within(stepper('Rainbow Pack')).getByText('0')).toBeInTheDocument()
    expect(getCart()).toEqual({})
  })

  it('adds one pack per tap of Add to Cart', () => {
    renderPurchase()
    const addButtons = screen.getAllByRole('button', { name: 'Add to Cart' })

    // The six Online Inventory packs, plus the contest winner's button, which
    // is deliberately still inert.
    fireEvent.click(addButtons[1])
    expect(getCart()).toEqual({ 'rainbow-pack': 1 })

    fireEvent.click(addButtons[1])
    expect(getCart()).toEqual({ 'rainbow-pack': 2 })
  })

  it('shows the live basket count under the button', () => {
    renderPurchase()
    fireEvent.click(screen.getByLabelText('Add one Rainbow Pack'))
    expect(within(stepper('Rainbow Pack')).getByText('1')).toBeInTheDocument()
    expect(within(stepper('Sunset Set')).getByText('0')).toBeInTheDocument()
  })

  it('steps a pack back down and off the basket', () => {
    renderPurchase()
    fireEvent.click(screen.getByLabelText('Add one Sunset Set'))
    fireEvent.click(screen.getByLabelText('Add one Sunset Set'))
    expect(within(stepper('Sunset Set')).getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove one Sunset Set'))
    expect(within(stepper('Sunset Set')).getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove one Sunset Set'))
    expect(getCart()).toEqual({})
  })

  // Nothing to remove means nothing to press — otherwise the button reads as
  // broken rather than as unavailable.
  it('disables minus at zero', () => {
    renderPurchase()
    expect(screen.getByLabelText('Remove one Rainbow Pack')).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Add one Rainbow Pack'))
    expect(screen.getByLabelText('Remove one Rainbow Pack')).toBeEnabled()
  })

  it('follows the basket when it changes on another page', () => {
    renderPurchase()
    act(() => setQty('classic-7', 5))
    expect(within(stepper('Classic 7')).getByText('5')).toBeInTheDocument()
  })

  it('leaves the contest winner button inert', () => {
    renderPurchase()
    const addButtons = screen.getAllByRole('button', { name: 'Add to Cart' })
    fireEvent.click(addButtons[0]) // the Contest Winner card comes first
    expect(getCart()).toEqual({})
  })
})
