// The logo on /home is drawn in the component: seven rainbow crayons fanned
// out, no tile behind them. The favicon is a separate, deliberately different
// mark — an app icon needs a background and has to survive 16px; a logo on a
// page does not, and a rounded tile blown up to 130px reads as a sticker.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CrayonLogo from '@/components/CrayonLogo'

describe('CrayonLogo', () => {
  it('draws the crayons rather than loading the favicon', () => {
    const { container } = render(<CrayonLogo />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('fans out one crayon per brand colour', () => {
    const { container } = render(<CrayonLogo showText={false} />)
    const rotated = [...container.querySelectorAll('div')].filter((d) =>
      d.style.transform?.includes('rotate'),
    )
    expect(rotated).toHaveLength(7)
  })

  it('shows the wordmark by default', () => {
    render(<CrayonLogo />)
    expect(screen.getByRole('heading', { name: 'Crayon Cookout' })).toBeInTheDocument()
  })

  it('can hide the wordmark', () => {
    render(<CrayonLogo showText={false} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('scales with the size it is given', () => {
    const { container } = render(<CrayonLogo size={200} showText={false} />)
    // The row that holds the crayons is sized to the requested height.
    const row = [...container.querySelectorAll('div')].find(
      (d) => d.style.height === '200px',
    )
    expect(row).toBeTruthy()
  })
})
