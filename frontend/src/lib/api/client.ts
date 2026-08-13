/**
 * The single HTTP boundary for the app.
 *
 * Nothing outside this directory calls `fetch`. Adapters call these helpers,
 * pages call adapters. That is what keeps the transport swappable — the same
 * property that made removing the previous hosted platform a one-directory job.
 */

/** Baked in at build time by Vite. Defaults to same-origin `/api`. */
const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

const TOKEN_KEY = 'cc_access_token'

export interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/** An error carrying the server's own message, safe to show to a user. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code = 'error') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  /** True when the caller should be sent back to sign in. */
  get isAuthFailure(): boolean {
    return this.status === 401
  }

  /** True when the server is reachable but this capability is not configured. */
  get isUnavailable(): boolean {
    return this.status === 503
  }
}

// --- token storage ----------------------------------------------------------
// localStorage, matching the app's existing `cc_*` convention. Readable by any
// script on the origin, so it depends on not having an XSS hole — the same
// assumption every SPA that is not using httpOnly cookies makes.

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing — the session simply will not persist */
  }
}

// --- request ----------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send the stored bearer token. Default true. */
  auth?: boolean
  signal?: AbortSignal
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`
  let code = 'error'
  try {
    const body = (await response.json()) as ApiErrorBody
    if (body?.error?.message) message = body.error.message
    if (body?.error?.code) code = body.error.code
  } catch {
    /* non-JSON error body — keep the generic message */
  }
  return new ApiError(message, response.status, code)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    // Network-level failure: no response at all. Distinguish it from a 5xx so
    // callers can say "you appear to be offline" rather than "server error".
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      0,
      'network_error',
    )
  }

  if (response.status === 204) return undefined as T
  if (!response.ok) throw await toApiError(response)

  try {
    return (await response.json()) as T
  } catch {
    return undefined as T
  }
}

/** Multipart upload — used by the collectible scanner. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    // Content-Type is deliberately unset: the browser must add the multipart
    // boundary itself.
    response = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: form })
  } catch {
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      0,
      'network_error',
    )
  }

  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
  upload,
}
