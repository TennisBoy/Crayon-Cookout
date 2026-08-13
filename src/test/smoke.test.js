// src/test/smoke.test.js
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('build scaffolding', () => {
  it('resolves the @ alias and merges classes', () => {
    expect(cn('h-9', 'h-12')).toBe('h-12')
  })
})
