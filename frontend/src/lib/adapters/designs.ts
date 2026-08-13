/**
 * CrayonDesign store.
 *
 * Talks to the Crayon Cookout API, which owns persistence in Postgres. The
 * exported signatures are unchanged from the localStorage implementation this
 * replaced, so Kitchen.jsx and Library.jsx did not need editing — that was the
 * point of putting a seam here.
 */
import { api } from '@/lib/api/client'

export interface Design {
  id: string
  name: string
  colors: string[]
  heights: number[]
  shape: string
  created_date: string
  is_competition_entry?: boolean
  competition_email?: string | null
}

export type DesignInput = Omit<Design, 'id' | 'created_date'>

/**
 * @param sort field name, `-` prefix for descending
 * @param limit server caps this at 100
 */
export async function list(sort = '-created_date', limit = 50): Promise<Design[]> {
  const query = `?sort=${encodeURIComponent(sort)}&limit=${limit}`
  return (await api.get<Design[]>(`/designs${query}`)) ?? []
}

export async function create(design: Partial<DesignInput>): Promise<Design> {
  return api.post<Design>('/designs', {
    name: design.name,
    colors: design.colors,
    heights: design.heights,
    shape: design.shape ?? 'crayon',
  })
}

export async function update(
  id: string,
  patch: Partial<Design>,
): Promise<Design> {
  return api.patch<Design>(`/designs/${encodeURIComponent(id)}`, patch)
}

export async function remove(id: string): Promise<void> {
  await api.delete<void>(`/designs/${encodeURIComponent(id)}`)
}
