// The basket is the one piece of this feature the user can corrupt by hand —
// it is JSON in localStorage — so most of what matters here is what happens
// when the stored value is not what we wrote.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCart, getQty, setQty, addToCart, clearCart, cartCount } from '@/lib/cart'

beforeEach(() => localStorage.clear())

describe('cart', () => {
  it('starts empty', () => {
    expect(getCart()).toEqual({})
    expect(getQty('meow-mix-6')).toBe(0)
    expect(cartCount()).toBe(0)
  })

  it('adds one pack at a time', () => {
    addToCart('meow-mix-6')
    expect(getQty('meow-mix-6')).toBe(1)
    addToCart('meow-mix-6')
    expect(getQty('meow-mix-6')).toBe(2)
  })

  it('keeps separate packs apart', () => {
    addToCart('meow-mix-6')
    addToCart('turtle-time-12')
    addToCart('turtle-time-12')
    expect(getCart()).toEqual({ 'meow-mix-6': 1, 'turtle-time-12': 2 })
    expect(cartCount()).toBe(3)
  })

  it('sets a quantity outright', () => {
    setQty('sky-scribbles-6', 4)
    expect(getQty('sky-scribbles-6')).toBe(4)
  })

  // The stepper's minus button walks a line down to zero; at zero the line has
  // to leave the basket rather than sit there as an invisible "0 x Turtle Time 12-pack".
  it('removes the line at zero rather than storing a zero', () => {
    addToCart('turtle-time-12')
    setQty('turtle-time-12', 0)
    expect(getQty('turtle-time-12')).toBe(0)
    expect('turtle-time-12' in getCart()).toBe(false)
  })

  it('never stores a negative quantity', () => {
    setQty('petal-party-6', -3)
    expect('petal-party-6' in getCart()).toBe(false)
  })

  it('empties on clear', () => {
    addToCart('dressed-to-doodle-12')
    clearCart()
    expect(getCart()).toEqual({})
  })

  it('falls back to an empty basket on unparseable data', () => {
    localStorage.setItem('cc_cart', 'not json at all')
    expect(getCart()).toEqual({})
  })

  it('falls back to an empty basket when the stored value is not an object', () => {
    localStorage.setItem('cc_cart', '[1,2,3]')
    expect(getCart()).toEqual({})
  })

  // One bad line should cost you that line, not the whole basket.
  it('drops junk lines but keeps the good ones', () => {
    localStorage.setItem(
      'cc_cart',
      JSON.stringify({ 'meow-mix-6': 2, 'turtle-time-12': 'lots', 'petal-party-6': 0, 'deep-sea-doodles-6': 1.5 }),
    )
    expect(getCart()).toEqual({ 'meow-mix-6': 2 })
  })

  // Both pages re-read on this event; without it the shelf and the basket drift.
  it('announces every write so the pages can react', () => {
    const seen = vi.fn()
    window.addEventListener('cc-cart-change', seen)

    addToCart('meow-mix-6')
    expect(seen).toHaveBeenCalledTimes(1)

    setQty('meow-mix-6', 5)
    expect(seen).toHaveBeenCalledTimes(2)

    clearCart()
    expect(seen).toHaveBeenCalledTimes(3)

    window.removeEventListener('cc-cart-change', seen)
  })
})
