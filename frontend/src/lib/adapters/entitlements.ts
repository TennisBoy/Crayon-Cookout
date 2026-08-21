/**
 * Entitlements adapter.
 *
 * The server decides what a user has paid for. This keeps a read-through cache
 * in localStorage so gated UI paints immediately on load and still works if the
 * API is briefly unreachable -- the same arrangement `cc_collected` uses for
 * collectibles.
 *
 * There is deliberately no `grant` here. Entitlements are written server-side
 * after a verified payment; a client that could grant its own would make paying
 * optional, which is the entire reason this stopped living in localStorage.
 */
import { api, ApiError } from '@/lib/api/client'

const CACHE_KEY = 'cc_entitlements'

/** Synchronous read for render paths. Falls back to empty on corrupt data. */
export function cachedFeatures(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === 'string') : []
  } catch {
    return []
  }
}

function writeCache(features: string[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(features))
  } catch {
    /* private browsing — the cache simply will not persist */
  }
  window.dispatchEvent(new Event('cc-premium-change'))
}

/** Clear the cache. Called on sign-out: entitlements belong to a user. */
export function clearEntitlements(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('cc-premium-change'))
}

/**
 * Fetch the authoritative list and update the cache.
 *
 * A signed-out caller owns nothing, so a 401 clears the cache rather than
 * erroring. Any other failure leaves the cache alone: a network blip should not
 * revoke features a user has paid for.
 */
export async function refreshEntitlements(): Promise<string[]> {
  try {
    const res = await api.get<{ features: string[] }>('/entitlements')
    const features = res?.features ?? []
    writeCache(features)
    return features
  } catch (err) {
    if (err instanceof ApiError && err.isAuthFailure) {
      clearEntitlements()
      return []
    }
    return cachedFeatures()
  }
}
