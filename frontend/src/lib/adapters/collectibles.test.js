import { describe, it, expect, vi, afterEach } from 'vitest'
import { list, verify, readCache } from '@/lib/adapters/collectibles'
import { setToken } from '@/lib/api/client'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => vi.restoreAllMocks())

describe('list', () => {
  it('returns the server collection and refreshes the cache', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ collected: ['Nature Set/Butterfly', 'Animals Set/Lion'] }),
    )

    expect(await list()).toEqual(['Nature Set/Butterfly', 'Animals Set/Lion'])
    expect(readCache()).toEqual(['Nature Set/Butterfly', 'Animals Set/Lion'])
  })

  it('falls back to the cache when the server is unreachable', async () => {
    // A flaky connection must not empty a child's shelves.
    localStorage.setItem('cc_collected', JSON.stringify(['Nature Set/Bee']))
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    expect(await list()).toEqual(['Nature Set/Bee'])
  })

  it('falls back to the cache on a 401 rather than wiping it', async () => {
    localStorage.setItem('cc_collected', JSON.stringify(['Nature Set/Bee']))
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'unauthenticated', message: 'Nope.' } }, 401),
    )

    expect(await list()).toEqual(['Nature Set/Bee'])
  })

  it('survives a corrupt cache', async () => {
    localStorage.setItem('cc_collected', '{not json')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    expect(await list()).toEqual([])
  })
})

describe('verify', () => {
  const target = {
    setName: 'Nature Set',
    crayonName: 'Butterfly',
    type: 'butterfly',
    color: '#A855F7',
  }
  const file = new File(['x'], 'crayon.png', { type: 'image/png' })

  it('sends every field the server requires', async () => {
    setToken('tok')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ matched: true, key: 'Nature Set/Butterfly' }))

    await verify(file, target)

    const body = fetchSpy.mock.calls[0][1].body
    expect(body.get('set_name')).toBe('Nature Set')
    expect(body.get('crayon_name')).toBe('Butterfly')
    expect(body.get('type')).toBe('butterfly')
    expect(body.get('color')).toBe('#A855F7')
    expect(body.get('file')).toBeInstanceOf(File)
  })

  it('caches the key on a match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ matched: true, key: 'Nature Set/Butterfly' }),
    )

    await verify(file, target)

    expect(readCache()).toEqual(['Nature Set/Butterfly'])
  })

  it('caches nothing when the photo does not match', async () => {
    // The anti-cheat: a failed check must not unlock anything, locally either.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ matched: false, key: 'Nature Set/Butterfly' }),
    )

    await verify(file, target)

    expect(readCache()).toEqual([])
  })

  it('does not duplicate an already-collected key', async () => {
    localStorage.setItem('cc_collected', JSON.stringify(['Nature Set/Butterfly']))
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ matched: true, key: 'Nature Set/Butterfly' }),
    )

    await verify(file, target)

    expect(readCache()).toEqual(['Nature Set/Butterfly'])
  })

  it('propagates a 503 rather than reporting a false match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'service_unavailable', message: 'Not set up.' } }, 503),
    )

    await expect(verify(file, target)).rejects.toThrow('Not set up.')
    expect(readCache()).toEqual([])
  })
})
