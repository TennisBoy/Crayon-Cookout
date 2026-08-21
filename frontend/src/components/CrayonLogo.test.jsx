// The logo used to be rebuilt out of rotated divs while the tab icon was a
// separate SVG file — two definitions of one mark. These pin that there is now
// exactly one source, so the two can never drift apart again.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CrayonLogo from '@/components/CrayonLogo'

describe('CrayonLogo', () => {
  it('renders the same asset the browser tab uses', () => {
    const { container } = render(<CrayonLogo />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/crayon-favicon.svg')
  })

  it('shows the wordmark by default', () => {
    render(<CrayonLogo />)
    expect(screen.getByRole('heading', { name: 'Crayon Cookout' })).toBeInTheDocument()
  })

  it('names the app for screen readers when the wordmark is hidden', () => {
    render(<CrayonLogo showText={false} />)
    expect(screen.getByRole('img', { name: 'Crayon Cookout' })).toBeInTheDocument()
  })

  it('does not repeat the name when the wordmark is visible', () => {
    const { container } = render(<CrayonLogo />)
    // Announcing "Crayon Cookout" twice in a row is worse than not at all.
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true')
  })

  it('honours the requested size', () => {
    const { container } = render(<CrayonLogo size={28} showText={false} />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('width', '28')
    expect(img.style.height).toBe('28px')
  })
})
