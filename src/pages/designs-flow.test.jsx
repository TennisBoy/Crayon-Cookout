import { describe, it, expect } from 'vitest'
import { create, list } from '@/lib/adapters/designs'

describe('Kitchen to Library round trip', () => {
  it('a saved design appears in the Library listing', async () => {
    await create({
      name: 'My Crayon Design',
      colors: ['#EF4444', '#3B82F6'],
      heights: [0.5, 0.5],
      shape: 'crayon',
    })
    const rows = await list('-created_date', 50)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('My Crayon Design')
    expect(rows[0].colors).toEqual(['#EF4444', '#3B82F6'])
    expect(rows[0].shape).toBe('crayon')
  })

  it('a competition entry update survives a reload', async () => {
    const saved = await create({ name: 'Sunset' })
    const { update } = await import('@/lib/adapters/designs')
    await update(saved.id, { is_competition_entry: true, competition_email: 'a@b.c' })
    const [row] = await list('-created_date', 50)
    expect(row.is_competition_entry).toBe(true)
    expect(row.competition_email).toBe('a@b.c')
  })
})
