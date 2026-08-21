// "Clear" used to wipe only the doodle layer. To anyone who had poured wax —
// which is most of the screen — the button did nothing at all.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/adapters/designs', () => ({ create: vi.fn(), list: vi.fn(() => Promise.resolve([])) }))

const Kitchen = (await import('@/pages/Kitchen')).default

// jsdom has no canvas backend; Kitchen's effects call getContext unguarded.
const ctx = {
  clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), closePath: vi.fn(),
}
beforeEach(() => {
  localStorage.setItem('cc_kitchen', 'true')
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx)
})
afterEach(() => vi.clearAllMocks())

const renderKitchen = () => render(<Kitchen />, { wrapper: MemoryRouter })

async function pourOnce(user) {
  // The mould is the only canvas; clicking it with the pour tool adds a segment
  // after the pouring animation.
  const canvas = document.querySelector('canvas')
  await user.click(canvas)
  await waitFor(
    () => expect(screen.queryByText('Pour wax!')).not.toBeInTheDocument(),
    { timeout: 3000 },
  )
}

describe('Kitchen — Clear', () => {
  it('removes poured wax, not just the drawing', async () => {
    const user = userEvent.setup()
    renderKitchen()
    expect(screen.getByText('Pour wax!')).toBeInTheDocument()

    await pourOnce(user)

    await user.click(screen.getByRole('button', { name: /Clear/i }))

    // The placeholder returning is the visible proof the wax is gone.
    expect(await screen.findByText('Pour wax!')).toBeInTheDocument()
  })

  it('also wipes the drawing canvas', async () => {
    const user = userEvent.setup()
    renderKitchen()
    ctx.clearRect.mockClear()

    await user.click(screen.getByRole('button', { name: /Clear/i }))
    expect(ctx.clearRect).toHaveBeenCalled()
  })

  it('disables Save while there is nothing to save', async () => {
    const user = userEvent.setup()
    renderKitchen()
    expect(screen.getByRole('button', { name: /Save to Library/i })).toBeDisabled()

    await pourOnce(user)
    expect(screen.getByRole('button', { name: /Save to Library/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Clear/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save to Library/i })).toBeDisabled(),
    )
  })
})
