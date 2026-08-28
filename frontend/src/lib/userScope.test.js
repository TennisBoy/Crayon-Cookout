// localStorage belongs to the browser, not to the person signed in. Sign out,
// sign in as someone else, and without scoping the second account inherits the
// first one's basket, collectibles, trial — and its premium flags.
import { describe, it, expect, beforeEach } from 'vitest'
import { applyUserScope } from '@/lib/userScope'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

const seedEverything = () => {
  localStorage.setItem('cc_entitlements', JSON.stringify(['kitchen', 'colouring']))
  localStorage.setItem('cc_collected', JSON.stringify(['Ocean/Coral']))
  localStorage.setItem('cc_cart', JSON.stringify({ 'meow-mix-6': 2 }))
  localStorage.setItem('cc_trial_expiry', String(Date.now() + 86400000))
  localStorage.setItem('cc_trial_used', 'true')
  localStorage.setItem('cc_kitchen', 'true')
}

beforeEach(() => localStorage.clear())

describe('applyUserScope', () => {
  it('wipes everything when a different account signs in', () => {
    applyUserScope(A)
    seedEverything()

    applyUserScope(B)

    for (const key of ['cc_entitlements', 'cc_collected', 'cc_cart', 'cc_trial_expiry', 'cc_trial_used', 'cc_kitchen']) {
      expect(localStorage.getItem(key), key).toBeNull()
    }
  })

  it('drops a stale premium flag that would unlock a paid feature', () => {
    // The leak that mattered: a flag left by an older build unlocked the
    // Kitchen for every account that signed in on this browser afterwards.
    applyUserScope(A)
    localStorage.setItem('cc_kitchen', 'true')

    applyUserScope(B)
    expect(localStorage.getItem('cc_kitchen')).toBeNull()
  })

  it('does not clear the trial for the SAME account', () => {
    applyUserScope(A)
    seedEverything()

    applyUserScope(A)
    expect(localStorage.getItem('cc_trial_used')).toBe('true')
    expect(localStorage.getItem('cc_cart')).not.toBeNull()
  })

  it('keeps a basket built before signing in', () => {
    // Same person, one moment later — throwing away what they just added
    // would be its own bug.
    localStorage.setItem('cc_cart', JSON.stringify({ 'meow-mix-6': 1 }))
    applyUserScope(A)
    expect(localStorage.getItem('cc_cart')).not.toBeNull()
  })

  it('clears on sign-out so the next person starts clean', () => {
    applyUserScope(A)
    seedEverything()

    applyUserScope(null)
    expect(localStorage.getItem('cc_entitlements')).toBeNull()
    expect(localStorage.getItem('cc_cart')).toBeNull()
    expect(localStorage.getItem('cc_user')).toBeNull()
  })

  it('does nothing on a first visit while signed out', () => {
    localStorage.setItem('cc_cart', JSON.stringify({ 'meow-mix-6': 1 }))
    expect(applyUserScope(null)).toBe(false)
    expect(localStorage.getItem('cc_cart')).not.toBeNull()
  })

  it('tells the UI to repaint', () => {
    const seen = []
    const on = (e) => seen.push(e.type)
    for (const evt of ['cc-premium-change', 'cc-collected-change', 'cc-cart-change']) {
      window.addEventListener(evt, on)
    }
    applyUserScope(A)
    applyUserScope(B)
    for (const evt of ['cc-premium-change', 'cc-collected-change', 'cc-cart-change']) {
      window.removeEventListener(evt, on)
    }
    expect(new Set(seen).size).toBe(3)
  })
})

describe('premium.hasFeature no longer trusts a local flag', () => {
  it('ignores cc_<feature> entirely', async () => {
    const { hasFeature } = await import('@/lib/premium')
    localStorage.setItem('cc_kitchen', 'true')
    expect(hasFeature('kitchen')).toBe(false)
  })

  it('still honours a server-granted entitlement', async () => {
    const { hasFeature } = await import('@/lib/premium')
    localStorage.setItem('cc_entitlements', JSON.stringify(['kitchen']))
    expect(hasFeature('kitchen')).toBe(true)
  })
})
