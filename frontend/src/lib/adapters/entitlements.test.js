// Entitlements are the difference between a paid feature and a suggestion.
// These pin the read-through cache's behaviour, especially its failure modes:
// a network blip must not revoke something a user paid for, and signing out
// must not leave another user's features behind.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const get = vi.fn()
class FakeApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
  get isAuthFailure() {
    return this.status === 401
  }
}

vi.mock('@/lib/api/client', () => ({
  api: { get: (...args) => get(...args) },
  ApiError: FakeApiError,
}))

const load = () => import('@/lib/adapters/entitlements')

beforeEach(() => {
  get.mockReset()
  localStorage.clear()
})
afterEach(() => vi.resetModules())

describe('entitlements cache', () => {
  it('is empty before anything is fetched', async () => {
    const { cachedFeatures } = await load()
    expect(cachedFeatures()).toEqual([])
  })

  it('caches what the server returns', async () => {
    get.mockResolvedValue({ features: ['kitchen'] })
    const { refreshEntitlements, cachedFeatures } = await load()

    expect(await refreshEntitlements()).toEqual(['kitchen'])
    expect(cachedFeatures()).toEqual(['kitchen'])
  })

  it('notifies the UI so gated components repaint', async () => {
    get.mockResolvedValue({ features: ['kitchen'] })
    const { refreshEntitlements } = await load()
    const handler = vi.fn()
    window.addEventListener('cc-premium-change', handler)

    await refreshEntitlements()
    expect(handler).toHaveBeenCalled()
    window.removeEventListener('cc-premium-change', handler)
  })

  it('keeps the cache when the network fails', async () => {
    get.mockResolvedValue({ features: ['kitchen'] })
    const { refreshEntitlements, cachedFeatures } = await load()
    await refreshEntitlements()

    get.mockRejectedValue(new Error('offline'))
    // A blip must not revoke a paid feature mid-drawing.
    expect(await refreshEntitlements()).toEqual(['kitchen'])
    expect(cachedFeatures()).toEqual(['kitchen'])
  })

  it('clears the cache on 401, because a signed-out user owns nothing', async () => {
    get.mockResolvedValue({ features: ['kitchen'] })
    const { refreshEntitlements, cachedFeatures } = await load()
    await refreshEntitlements()

    get.mockRejectedValue(new FakeApiError('unauthorised', 401))
    expect(await refreshEntitlements()).toEqual([])
    expect(cachedFeatures()).toEqual([])
  })

  it('survives corrupt cache data', async () => {
    localStorage.setItem('cc_entitlements', '{not json')
    const { cachedFeatures } = await load()
    expect(cachedFeatures()).toEqual([])
  })

  it('clearEntitlements empties it', async () => {
    get.mockResolvedValue({ features: ['kitchen'] })
    const { refreshEntitlements, clearEntitlements, cachedFeatures } = await load()
    await refreshEntitlements()

    clearEntitlements()
    expect(cachedFeatures()).toEqual([])
  })
})

describe('premium.hasFeature', () => {
  it('is true when the server says so, with no local flag', async () => {
    get.mockResolvedValue({ features: ['kitchen'] })
    const { refreshEntitlements } = await load()
    const { hasFeature } = await import('@/lib/premium')
    await refreshEntitlements()

    expect(hasFeature('kitchen')).toBe(true)
    expect(localStorage.getItem('cc_kitchen')).toBeNull()
  })

  it('ignores a local flag entirely', async () => {
    // hasFeature answers only for server-granted entitlements now. A stale
    // cc_<feature> on a shared browser used to unlock a paid feature for every
    // account that signed in afterwards.
    const { hasFeature } = await import('@/lib/premium')
    localStorage.setItem('cc_kitchen', 'true')
    expect(hasFeature('kitchen')).toBe(false)
  })

  it('reads the trial from its own key, not from hasFeature', async () => {
    const { hasTrialUsed } = await import('@/lib/premium')
    localStorage.setItem('cc_trial_used', 'true')
    expect(hasTrialUsed()).toBe(true)
  })
})
