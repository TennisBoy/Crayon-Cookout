/**
 * Collectibles.
 *
 * The server is the source of truth — a collection should survive a new phone.
 * `cc_collected` stays as a local cache so the shelves paint instantly and
 * still render something sensible offline.
 *
 * Verification and unlocking are ONE server call on purpose. There is no
 * "mark collected" endpoint: if there were, the photo check would be advisory
 * and the mechanic would be honour-system.
 */
import { api } from '@/lib/api/client'

const CACHE_KEY = 'cc_collected'

/** Keys are `"Set Name/Crayon Name"` — the form the SPA has always used. */
export type CollectedKey = string

export function readCache(): CollectedKey[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCache(keys: CollectedKey[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(keys))
    window.dispatchEvent(new Event('cc-collected-change'))
  } catch {
    /* storage unavailable — the server still has the truth */
  }
}

/**
 * Fetch the collection, refreshing the cache.
 *
 * Falls back to the cache when the server cannot be reached, so a flaky
 * connection empties nobody's shelves.
 */
export async function list(): Promise<CollectedKey[]> {
  try {
    const res = await api.get<{ collected: CollectedKey[] }>('/collectibles')
    const collected = res?.collected ?? []
    writeCache(collected)
    return collected
  } catch {
    return readCache()
  }
}

export interface VerifyTarget {
  setName: string
  crayonName: string
  type: string
  color: string
}

/**
 * Verify a photo and, on a match, unlock the crayon.
 *
 * Throws if the server is unreachable or has no vision key configured —
 * Library's existing catch turns that into the normal "didn't match" state
 * rather than falsely marking a crayon collected.
 */
export async function verify(
  file: File,
  target: VerifyTarget,
): Promise<{ matched: boolean; key: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('set_name', target.setName)
  form.append('crayon_name', target.crayonName)
  form.append('type', target.type)
  form.append('color', target.color)

  const result = await api.upload<{ matched: boolean; key: string }>(
    '/collectibles/verify',
    form,
  )

  if (result.matched) {
    writeCache([...new Set([...readCache(), result.key])])
  }
  return result
}
