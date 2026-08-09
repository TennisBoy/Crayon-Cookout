import { describe, it, expect } from 'vitest'
import { NotImplementedError } from '@/lib/adapters/errors'
import * as auth from '@/lib/adapters/auth'

const METHODS = [
  ['signIn', [{ email: 'a@b.c', password: 'x' }]],
  ['signUp', [{ email: 'a@b.c', password: 'x' }]],
  ['verifyOtp', [{ email: 'a@b.c', code: '123456' }]],
  ['resendOtp', ['a@b.c']],
  ['setToken', ['tok']],
  ['requestPasswordReset', ['a@b.c']],
  ['resetPassword', [{ token: 't', newPassword: 'x' }]],
  ['signInWithProvider', ['google', '/']],
  ['getCurrentUser', []],
  ['signOut', ['/']],
  ['redirectToLogin', ['/']],
]

describe('auth adapter', () => {
  it('exports every method the pages call', () => {
    for (const [name] of METHODS) {
      expect(typeof auth[name]).toBe('function')
    }
  })

  it.each(METHODS)('%s rejects with NotImplementedError naming itself', async (name, args) => {
    await expect(auth[name](...args)).rejects.toThrow(NotImplementedError)
    await expect(auth[name](...args)).rejects.toThrow(name)
  })

  it('reports a message a user can read in an error banner', async () => {
    await expect(auth.signIn({ email: 'a@b.c', password: 'x' }))
      .rejects.toThrow(/needs a backend/)
  })
})
