/**
 * Crayon photo verification.
 *
 * Replaces the removed hosted file-upload + LLM pair, which verified that a
 * photo showed a physical collectible crayon of a given shape and colour.
 * This is the anti-cheat for the collectibles mechanic, so it must run
 * server-side with a real vision model — never from the browser with an API key.
 *
 * @param {File} file photo from the device camera
 * @param {{type: string, color: string}} target expected crayon shape and colour
 * @returns {Promise<{matched: boolean}>}
 */
import { NotImplementedError } from './errors'

export async function verifyCrayonPhoto(file, target) {
  void file; void target
  throw new NotImplementedError('verifyCrayonPhoto')
}
