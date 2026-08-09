import { describe, it, expect } from 'vitest'
import { list, create, update, remove } from '@/lib/adapters/designs'

describe('designs adapter', () => {
  it('starts empty', async () => {
    expect(await list('-created_date', 50)).toEqual([])
  })

  it('assigns an id and created_date on create', async () => {
    const saved = await create({ name: 'Sunset', colors: ['#EF4444'], heights: [1], shape: 'crayon' })
    expect(saved.id).toEqual(expect.any(String))
    expect(saved.created_date).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(saved.created_date))).toBe(false)
    expect(saved.name).toBe('Sunset')
  })

  it('gives every design a distinct id', async () => {
    const a = await create({ name: 'A' })
    const b = await create({ name: 'B' })
    expect(a.id).not.toBe(b.id)
  })

  it('sorts newest first for -created_date', async () => {
    await create({ name: 'first', created_date: '2020-01-01T00:00:00.000Z' })
    await create({ name: 'second', created_date: '2030-01-01T00:00:00.000Z' })
    const rows = await list('-created_date', 50)
    expect(rows.map(r => r.name)).toEqual(['second', 'first'])
  })

  it('sorts oldest first for created_date', async () => {
    await create({ name: 'first', created_date: '2020-01-01T00:00:00.000Z' })
    await create({ name: 'second', created_date: '2030-01-01T00:00:00.000Z' })
    const rows = await list('created_date', 50)
    expect(rows.map(r => r.name)).toEqual(['first', 'second'])
  })

  it('honours the limit', async () => {
    await create({ name: 'a' })
    await create({ name: 'b' })
    await create({ name: 'c' })
    expect(await list('-created_date', 2)).toHaveLength(2)
  })

  it('merges a patch on update and leaves other fields alone', async () => {
    const saved = await create({ name: 'Sunset', colors: ['#EF4444'] })
    const updated = await update(saved.id, { is_competition_entry: true, competition_email: 'a@b.c' })
    expect(updated.is_competition_entry).toBe(true)
    expect(updated.competition_email).toBe('a@b.c')
    expect(updated.name).toBe('Sunset')
    expect(updated.colors).toEqual(['#EF4444'])
    const [row] = await list('-created_date', 50)
    expect(row.is_competition_entry).toBe(true)
  })

  it('removes by id and leaves the rest', async () => {
    const a = await create({ name: 'a' })
    await create({ name: 'b' })
    await remove(a.id)
    const rows = await list('-created_date', 50)
    expect(rows.map(r => r.name)).toEqual(['b'])
  })

  it('returns an empty list when storage holds corrupt JSON', async () => {
    localStorage.setItem('cc_designs', '{not json')
    expect(await list('-created_date', 50)).toEqual([])
  })

  it('rejects when updating an unknown id', async () => {
    await expect(update('nope', { name: 'x' })).rejects.toThrow(/not found/i)
  })
})
