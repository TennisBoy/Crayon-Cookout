// The Cart used to answer "did my purchase go through?"; that question now
// belongs to the Shop, which badges an owned pass directly. What the Cart owes
// its user is a truthful count and a truthful total.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Cart from '@/pages/Cart'
import { getCart } from '@/lib/cart'

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
    seed({ 'rainbow-pack': 2, 'sunset-set': 1 })
    renderCart()

    expect(screen.getByText('Rainbow Pack')).toBeInTheDocument()
    expect(screen.getByText('Sunset Set')).toBeInTheDocument()
    expect(within(stepper('Rainbow Pack')).getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('No packs in your cart yet!')).not.toBeInTheDocument()
  })

  it('totals a line by quantity and the basket by line', () => {
    seed({ 'rainbow-pack': 2, 'sunset-set': 1 }) // 8.99*2 + 6.99 = 24.97
    renderCart()

    expect(screen.getByText('$17.98')).toBeInTheDocument() // the Rainbow line
    expect(screen.getByText('$24.97')).toBeInTheDocument() // the subtotal
  })

  it('counts packs, not lines, in the summary', () => {
    seed({ 'rainbow-pack': 2, 'sunset-set': 1 })
    renderCart()
    expect(screen.getByText('3 packs ready to go.')).toBeInTheDocument()
  })

  it('says "pack" rather than "packs" for a single one', () => {
    seed({ 'rainbow-pack': 1 })
    renderCart()
    expect(screen.getByText('1 pack ready to go.')).toBeInTheDocument()
  })

  it('adds and removes one at a time from the line', () => {
    seed({ 'rainbow-pack': 2 })
    renderCart()

    fireEvent.click(screen.getByLabelText('Add one Rainbow Pack'))
    expect(getCart()['rainbow-pack']).toBe(3)

    fireEvent.click(screen.getByLabelText('Remove one Rainbow Pack'))
    expect(getCart()['rainbow-pack']).toBe(2)
  })

  it('drops the line entirely when the last one is removed', () => {
    seed({ 'rainbow-pack': 1 })
    renderCart()

    fireEvent.click(screen.getByLabelText('Remove one Rainbow Pack'))
    expect(getCart()).toEqual({})
    expect(screen.getByText('No packs in your cart yet!')).toBeInTheDocument()
  })

  it('empties a whole line from the bin button', () => {
    seed({ 'rainbow-pack': 4, 'sunset-set': 1 })
    renderCart()

    fireEvent.click(screen.getByLabelText('Remove Rainbow Pack from cart'))
    expect(getCart()).toEqual({ 'sunset-set': 1 })
  })

  // A basket can outlive the pack it holds; that must not blank the page.
  it('skips a pack that is no longer sold', () => {
    seed({ 'rainbow-pack': 1, 'discontinued-pack': 3 })
    renderCart()

    expect(screen.getByText('Rainbow Pack')).toBeInTheDocument()
    expect(screen.getByText('1 pack ready to go.')).toBeInTheDocument()

    // The subtotal counts the surviving pack only, not the ghost's 3.
    const subtotalRow = screen.getByText('Subtotal').closest('div')
    expect(within(subtotalRow).getByText('$8.99')).toBeInTheDocument()
  })
})
