/**
 * CrayonDesign store.
 *
 * Replaces the removed hosted entity API with localStorage under `cc_designs`,
 * matching the cc_* convention in lib/premium.js. Swap the read/write helpers
 * for network calls to move this to a real backend; the exported signatures
 * are what Kitchen.jsx and Library.jsx depend on.
 */
const STORAGE_KEY = 'cc_designs'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch (err) {
    throw new Error('Could not save design. Browser storage is full or unavailable.', { cause: err })
  }
}

function generateId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * @param {string} [sort] field name, `-` prefix for descending
 * @param {number} [limit]
 */
export async function list(sort = '-created_date', limit = 50) {
  const rows = readAll()
  const descending = sort.startsWith('-')
  const field = descending ? sort.slice(1) : sort
  const sorted = [...rows].sort((a, b) => {
    const left = a?.[field] ?? ''
    const right = b?.[field] ?? ''
    if (left === right) return 0
    return (left < right ? -1 : 1) * (descending ? -1 : 1)
  })
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

export async function create(design) {
  const row = {
    ...design,
    id: design?.id ?? generateId(),
    created_date: design?.created_date ?? new Date().toISOString(),
  }
  writeAll([...readAll(), row])
  return row
}

export async function update(id, patch) {
  const rows = readAll()
  const index = rows.findIndex(row => row.id === id)
  if (index === -1) throw new Error(`Design ${id} not found`)
  const updated = { ...rows[index], ...patch, id: rows[index].id }
  rows[index] = updated
  writeAll(rows)
  return updated
}

export async function remove(id) {
  writeAll(readAll().filter(row => row.id !== id))
}
