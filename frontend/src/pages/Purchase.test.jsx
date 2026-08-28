// The shelf has to agree with the basket in both directions: adding here shows
// up in cc_cart, and a basket changed elsewhere shows up here.
//
// Each size of a set is its own basket line, so the 6 and the 12 of one design
// are stepped independently and can both be in the basket at once.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Purchase from '@/pages/Purchase'
import { getCart, setQty } from '@/lib/cart'

const renderPurchase = () =>
  render(
    <MemoryRouter>
      <Purchase />
    </MemoryRouter>
  )
const stepper = (name) => screen.getByRole('group', { name: `${name} quantity` })
const goToCartLinks = () => screen.queryAllByRole('link', { name: /go to cart/i })

beforeEach(() => localStorage.clear())

describe('Purchase', () => {
  it('starts every size of every set at zero', () => {
    renderPurchase()
    expect(within(stepper('Meow Mix 6-pack')).getByText('0')).toBeInTheDocument()
    expect(within(stepper('Meow Mix 12-pack')).getByText('0')).toBeInTheDocument()
    expect(within(stepper('Dressed to Doodle 12-pack')).getByText('0')).toBeInTheDocument()
    expect(getCart()).toEqual({})
  })

  it('sells all six sets in both sizes', () => {
    renderPurchase()
    const sets = [
      'Meow Mix',
      'Turtle Time',
      'Sky Scribbles',
      'Petal Party',
      'Deep Sea Doodles',
      'Dressed to Doodle',
    ]
    for (const name of sets) {
      expect(stepper(`${name} 6-pack`)).toBeInTheDocument()
      expect(stepper(`${name} 12-pack`)).toBeInTheDocument()
    }
  })

  it('adds one pack per tap, counting each size separately', () => {
    renderPurchase()
    fireEvent.click(screen.getByLabelText('Add one Meow Mix 6-pack'))
    fireEvent.click(screen.getByLabelText('Add one Meow Mix 6-pack'))
    fireEvent.click(screen.getByLabelText('Add one Meow Mix 12-pack'))

    // The whole point of two ids: two 6s AND a 12 of the same design.
    expect(getCart()).toEqual({ 'meow-mix-6': 2, 'meow-mix-12': 1 })
    expect(within(stepper('Meow Mix 6-pack')).getByText('2')).toBeInTheDocument()
    expect(within(stepper('Meow Mix 12-pack')).getByText('1')).toBeInTheDocument()
  })

  it('steps a pack back down and off the basket', () => {
    renderPurchase()
    fireEvent.click(screen.getByLabelText('Add one Turtle Time 6-pack'))
    fireEvent.click(screen.getByLabelText('Add one Turtle Time 6-pack'))
    expect(within(stepper('Turtle Time 6-pack')).getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove one Turtle Time 6-pack'))
    expect(within(stepper('Turtle Time 6-pack')).getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove one Turtle Time 6-pack'))
    expect(getCart()).toEqual({})
  })

  // Nothing to remove means nothing to press — otherwise the button reads as
  // broken rather than as unavailable.
  it('disables minus at zero', () => {
    renderPurchase()
    expect(screen.getByLabelText('Remove one Petal Party 12-pack')).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Add one Petal Party 12-pack'))
    expect(screen.getByLabelText('Remove one Petal Party 12-pack')).toBeEnabled()
  })

  it('follows the basket when it changes on another page', () => {
    renderPurchase()
    act(() => setQty('sky-scribbles-12', 5))
    expect(within(stepper('Sky Scribbles 12-pack')).getByText('5')).toBeInTheDocument()
  })

  it('prices a 12 below two 6s, and says what that saves', () => {
    renderPurchase()
    expect(screen.getAllByText('$2.99')).toHaveLength(6)
    expect(screen.getAllByText('$5.49')).toHaveLength(6)
    expect(screen.getAllByText('save 49¢')).toHaveLength(6)
  })

  // Adding is what the steppers are for. A second control that also added was
  // the thing being replaced here.
  it('has no Add to Cart button anywhere, not even on the contest winner', () => {
    renderPurchase()
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
  })

  it('offers Go to Cart only for a set with something in it', () => {
    renderPurchase()
    expect(goToCartLinks()).toHaveLength(0)

    fireEvent.click(screen.getByLabelText('Add one Deep Sea Doodles 6-pack'))
    expect(goToCartLinks()).toHaveLength(1)
    expect(goToCartLinks()[0]).toHaveAttribute('href', '/cart')

    // Either size of a set lights up that set's one button, and no other's.
    fireEvent.click(screen.getByLabelText('Add one Deep Sea Doodles 12-pack'))
    expect(goToCartLinks()).toHaveLength(1)

    fireEvent.click(screen.getByLabelText('Add one Meow Mix 6-pack'))
    expect(goToCartLinks()).toHaveLength(2)
  })

  it('takes Go to Cart away again when the set is emptied', () => {
    renderPurchase()
    fireEvent.click(screen.getByLabelText('Add one Meow Mix 6-pack'))
    expect(goToCartLinks()).toHaveLength(1)

    fireEvent.click(screen.getByLabelText('Remove one Meow Mix 6-pack'))
    expect(goToCartLinks()).toHaveLength(0)
  })
})
