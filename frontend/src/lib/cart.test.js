// The basket is the one piece of this feature the user can corrupt by hand —
// it is JSON in localStorage — so most of what matters here is what happens
// when the stored value is not what we wrote.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCart, getQty, setQty, addToCart, clearCart, cartCount } from '@/lib/cart'

beforeEach(() => localStorage.clear())

describe('cart', () => {
  it('starts empty', () => {
    expect(getCart()).toEqual({})
    expect(getQty('rainbow-pack')).toBe(0)
    expect(cartCount()).toBe(0)
  })

  it('adds one pack at a time', () => {
    addToCart('rainbow-pack')
    expect(getQty('rainbow-pack')).toBe(1)
    addToCart('rainbow-pack')
    expect(getQty('rainbow-pack')).toBe(2)
  })

  it('keeps separate packs apart', () => {
    addToCart('rainbow-pack')
    addToCart('sunset-set')
    addToCart('sunset-set')
    expect(getCart()).toEqual({ 'rainbow-pack': 1, 'sunset-set': 2 })
    expect(cartCount()).toBe(3)
  })

  it('sets a quantity outright', () => {
    setQty('ocean-bundle', 4)
    expect(getQty('ocean-bundle')).toBe(4)
  })

  // The stepper's minus button walks a line down to zero; at zero the line has
  // to leave the basket rather than sit there as an invisible "0 x Sunset Set".
  it('removes the line at zero rather than storing a zero', () => {
    addToCart('sunset-set')
    setQty('sunset-set', 0)
    expect(getQty('sunset-set')).toBe(0)
    expect('sunset-set' in getCart()).toBe(false)
  })

  it('never stores a negative quantity', () => {
    setQty('dino-shapes', -3)
    expect('dino-shapes' in getCart()).toBe(false)
  })

  it('empties on clear', () => {
    addToCart('classic-7')
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
      JSON.stringify({ 'rainbow-pack': 2, 'sunset-set': 'lots', 'dino-shapes': 0, 'glitter-pink': 1.5 }),
    )
    expect(getCart()).toEqual({ 'rainbow-pack': 2 })
  })

  // Both pages re-read on this event; without it the shelf and the basket drift.
  it('announces every write so the pages can react', () => {
    const seen = vi.fn()
    window.addEventListener('cc-cart-change', seen)

    addToCart('rainbow-pack')
    expect(seen).toHaveBeenCalledTimes(1)

    setQty('rainbow-pack', 5)
    expect(seen).toHaveBeenCalledTimes(2)

    clearCart()
    expect(seen).toHaveBeenCalledTimes(3)

    window.removeEventListener('cc-cart-change', seen)
  })
})
