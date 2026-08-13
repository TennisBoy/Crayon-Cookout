import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { api, ApiError, getToken, setToken } from '@/lib/api/client'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

beforeEach(() => setToken(null))
afterEach(() => vi.restoreAllMocks())

describe('token storage', () => {
  it('round-trips a token', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
  })

  it('clears on null', () => {
    setToken('abc')
    setToken(null)
    expect(getToken()).toBeNull()
  })
})

describe('request', () => {
  it('prefixes the configured base URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([]))
    await api.get('/designs')
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/designs')
  })

  it('attaches the bearer token when one is stored', async () => {
    setToken('tok-123')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}))
    await api.get('/auth/me')
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123')
  })

  it('omits the header when auth is disabled', async () => {
    setToken('tok-123')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}))
    await api.post('/auth/login', { email: 'a@b.c' }, { auth: false })
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  it('sends JSON bodies with the right content type', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}))
    await api.post('/designs', { name: 'Sunset' })
    const init = fetchSpy.mock.calls[0][1]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ name: 'Sunset' })
  })

  it('returns undefined for 204 rather than trying to parse a body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    await expect(api.delete('/designs/abc')).resolves.toBeUndefined()
  })
})

describe('errors', () => {
  it("surfaces the server's message", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'not_found', message: 'That design does not exist.' } }, 404),
    )
    await expect(api.get('/designs/nope')).rejects.toThrow(
      'That design does not exist.',
    )
  })

  it('carries status and code for callers that branch on them', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'unauthenticated', message: 'Nope.' } }, 401),
    )
    const err = await api.get('/auth/me').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.code).toBe('unauthenticated')
    expect(err.isAuthFailure).toBe(true)
  })

  it('flags a 503 as unavailable so callers can say "not configured"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'service_unavailable', message: 'Not set up.' } }, 503),
    )
    const err = await api.post('/vision/verify-crayon').catch((e) => e)
    expect(err.isUnavailable).toBe(true)
  })

  it('degrades gracefully when the error body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>502</html>', { status: 502 }),
    )
    const err = await api.get('/designs').catch((e) => e)
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/Request failed/)
  })

  it('distinguishes an unreachable server from an error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await api.get('/designs').catch((e) => e)
    expect(err.code).toBe('network_error')
    expect(err.status).toBe(0)
    expect(err.message).toMatch(/Could not reach the server/)
  })
})

describe('upload', () => {
  it('does not set Content-Type, so the browser adds the multipart boundary', async () => {
    setToken('tok')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ matched: true }))
    const form = new FormData()
    form.append('type', 'butterfly')

    const result = await api.upload('/vision/verify-crayon', form)

    const init = fetchSpy.mock.calls[0][1]
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(result).toEqual({ matched: true })
  })
})
