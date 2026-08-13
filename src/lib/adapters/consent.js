/**
 * OAuth/MCP consent.
 *
 * Replaces the removed hosted platform's consent-info and authorize-grant
 * endpoints. Those implemented a platform-specific MCP consent protocol and
 * have no meaning outside it; the page is kept so its UI survives for a future
 * equivalent flow.
 */
import { NotImplementedError } from './errors'

/** @param {string} handle opaque consent handle from the query string */
export async function fetchConsentInfo(handle) {
  void handle
  throw new NotImplementedError('fetchConsentInfo')
}

/** @param {object} payload grant decision to record */
export async function grantConsent(payload) {
  void payload
  throw new NotImplementedError('grantConsent')
}
