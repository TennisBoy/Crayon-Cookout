/**
 * Auth adapter.
 *
 * Talks to the Crayon Cookout API, which fronts Supabase Auth. Signatures are
 * unchanged from the stubbed version, so the five auth pages did not need
 * editing beyond nothing at all — they already called these names.
 *
 * The access token lives in localStorage via the api client; every method that
 * establishes a session stores it, and signOut clears it.
 */
import {
  api,
  setToken as storeToken,
  setRefreshToken as storeRefreshToken,
  clearSession,
  getToken,
} from '@/lib/api/client'

export interface User {
  id: string
  email: string | null
}

interface SessionResponse {
  access_token: string
  refresh_token?: string | null
  user: User
}

interface MessageResponse {
  message: string
}

export async function signIn({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<User> {
  const session = await api.post<SessionResponse>(
    '/auth/login',
    { email, password },
    { auth: false },
  )
  storeToken(session.access_token)
  storeRefreshToken(session.refresh_token ?? null)
  return session.user
}

export async function signUp({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<string> {
  const res = await api.post<MessageResponse>(
    '/auth/signup',
    { email, password },
    { auth: false },
  )
  return res.message
}

export async function verifyOtp({
  email,
  code,
}: {
  email: string
  code: string
}): Promise<{ accessToken: string; user: User }> {
  const session = await api.post<SessionResponse>(
    '/auth/verify-otp',
    { email, code },
    { auth: false },
  )
  storeToken(session.access_token)
  storeRefreshToken(session.refresh_token ?? null)
  return { accessToken: session.access_token, user: session.user }
}

export async function resendOtp(email: string): Promise<string> {
  const res = await api.post<MessageResponse>(
    '/auth/resend-otp',
    { email },
    { auth: false },
  )
  return res.message
}

/** Kept for call-site compatibility; verifyOtp already stores the token. */
export async function setToken(token: string): Promise<void> {
  storeToken(token)
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await api.post<MessageResponse>(
    '/auth/password-reset/request',
    { email },
    { auth: false },
  )
  return res.message
}

export async function resetPassword({
  token,
  newPassword,
}: {
  token: string
  newPassword: string
}): Promise<string> {
  const res = await api.post<MessageResponse>(
    '/auth/password-reset/confirm',
    { token, new_password: newPassword },
    { auth: false },
  )
  return res.message
}

export async function getCurrentUser(): Promise<User> {
  if (!getToken()) {
    // No token is "signed out", not an error worth a round trip.
    throw Object.assign(new Error('Not signed in.'), { status: 401 })
  }
  return api.get<User>('/auth/me')
}

export async function signOut(returnTo?: string): Promise<void> {
  try {
    await api.post<MessageResponse>('/auth/logout')
  } finally {
    // Clear locally even if the server call fails — the user asked to leave.
    clearSession()
    if (returnTo && typeof window !== 'undefined') window.location.href = returnTo
  }
}

export async function redirectToLogin(returnTo?: string): Promise<void> {
  if (typeof window === 'undefined') return
  const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''
  window.location.href = `/login${next}`
}

/**
 * OAuth sign-in.
 *
 * Not wired yet: it needs a provider configured in the Supabase dashboard and
 * a redirect URL registered. Throws rather than silently doing nothing, so the
 * Google button reports an honest error instead of appearing broken.
 * See docs/supabase-setup.md.
 */
export async function signInWithProvider(
  provider: string,
  _returnTo?: string,
): Promise<never> {
  throw new Error(
    `Signing in with ${provider} is not configured on this server yet.`,
  )
}
