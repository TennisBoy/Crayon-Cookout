import { describe, it, expect } from 'vitest'
import { NotImplementedError } from '@/lib/adapters/errors'
import { verifyCrayonPhoto } from '@/lib/adapters/vision'
import { fetchConsentInfo, grantConsent } from '@/lib/adapters/consent'

describe('vision adapter', () => {
  it('rejects with NotImplementedError', async () => {
    const file = new File(['x'], 'crayon.png', { type: 'image/png' })
    await expect(verifyCrayonPhoto(file, { type: 'butterfly', color: '#A855F7' }))
      .rejects.toThrow(NotImplementedError)
  })

  it('names itself so Library can surface the reason', async () => {
    const file = new File(['x'], 'crayon.png', { type: 'image/png' })
    await expect(verifyCrayonPhoto(file, { type: 'lion', color: '#F97316' }))
      .rejects.toThrow('verifyCrayonPhoto')
  })
})

describe('consent adapter', () => {
  it('rejects fetchConsentInfo', async () => {
    await expect(fetchConsentInfo('handle')).rejects.toThrow(NotImplementedError)
  })

  it('rejects grantConsent', async () => {
    await expect(grantConsent({ handle: 'h' })).rejects.toThrow(NotImplementedError)
  })
})
