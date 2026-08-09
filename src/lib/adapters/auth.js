/**
 * Auth adapter.
 *
 * Replaces base44.auth.*. Every method is stubbed: wire a real provider by
 * replacing the bodies below. Signatures are fixed — the auth pages and
 * AuthContext call them directly.
 */
import { NotImplementedError } from './errors'

/** @returns {Promise<{id: string, email: string}>} */
export async function signIn({ email, password }) {
  void email; void password
  throw new NotImplementedError('signIn')
}

/** @returns {Promise<void>} */
export async function signUp({ email, password }) {
  void email; void password
  throw new NotImplementedError('signUp')
}

/** @returns {Promise<{accessToken: string}>} */
export async function verifyOtp({ email, code }) {
  void email; void code
  throw new NotImplementedError('verifyOtp')
}

/** @returns {Promise<void>} */
export async function resendOtp(email) {
  void email
  throw new NotImplementedError('resendOtp')
}

/** @returns {Promise<void>} */
export async function setToken(token) {
  void token
  throw new NotImplementedError('setToken')
}

/** @returns {Promise<void>} */
export async function requestPasswordReset(email) {
  void email
  throw new NotImplementedError('requestPasswordReset')
}

/** @returns {Promise<void>} */
export async function resetPassword({ token, newPassword }) {
  void token; void newPassword
  throw new NotImplementedError('resetPassword')
}

/** @returns {Promise<void>} */
export async function signInWithProvider(provider, returnTo) {
  void provider; void returnTo
  throw new NotImplementedError('signInWithProvider')
}

/** @returns {Promise<{id: string, email: string}>} */
export async function getCurrentUser() {
  throw new NotImplementedError('getCurrentUser')
}

/** @returns {Promise<void>} */
export async function signOut(returnTo) {
  void returnTo
  throw new NotImplementedError('signOut')
}

/** @returns {Promise<void>} */
export async function redirectToLogin(returnTo) {
  void returnTo
  throw new NotImplementedError('redirectToLogin')
}
