/**
 * Crayon photo verification.
 *
 * Posts the camera file to the API, which runs the vision model server-side.
 * It has to be server-side: this is the anti-cheat for the collectibles
 * mechanic, and a key shipped to the browser would be readable by anyone who
 * opens devtools.
 *
 * If the server has no vision key configured it answers 503, which surfaces
 * here as a thrown error — Library.jsx's existing catch turns that into the
 * normal "didn't match" state rather than falsely marking a crayon collected.
 */
import { api } from '@/lib/api/client'

export interface CrayonTarget {
  type: string
  color: string
}

export async function verifyCrayonPhoto(
  file: File,
  target: CrayonTarget,
): Promise<{ matched: boolean }> {
  const form = new FormData()
  form.append('file', file)
  form.append('type', target.type)
  form.append('color', target.color)
  return api.upload<{ matched: boolean }>('/vision/verify-crayon', form)
}
