// Every clipPath except the crayon's was drawn for a square box. Rendering one
// into the app's 1:2 mould stretched it 2x vertically — a star came out as a
// spike. These pin the proportions rather than the pixels.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import CrayonShape from '@/components/CrayonShape'
import { SHAPES } from '@/lib/premium'

function clippedBox(container) {
  return [...container.querySelectorAll('div')].find((d) => d.style.clipPath)
}

describe('CrayonShape proportions', () => {
  it('keeps a square mould square inside a tall box', () => {
    const { container } = render(<CrayonShape shape="star" width={140} height={280} />)
    const box = clippedBox(container)
    expect(box.style.width).toBe('140px')
    expect(box.style.height).toBe('140px')
  })

  it('fills a tall box with the crayon, which was drawn for one', () => {
    const { container } = render(<CrayonShape shape="crayon" width={140} height={280} />)
    const box = clippedBox(container)
    expect(box.style.width).toBe('140px')
    expect(box.style.height).toBe('280px')
  })

  it('never overflows the box it was given', () => {
    for (const shape of Object.keys(SHAPES)) {
      const { container } = render(<CrayonShape shape={shape} width={100} height={100} />)
      const box = clippedBox(container)
      expect(parseFloat(box.style.width)).toBeLessThanOrEqual(100)
      expect(parseFloat(box.style.height)).toBeLessThanOrEqual(100)
    }
  })

  it('still stacks the poured segments', () => {
    const { container } = render(
      <CrayonShape shape="star" colors={['#EF4444', '#3B82F6']} heights={[50, 50]} />,
    )
    const segments = [...container.querySelectorAll('div')].filter((d) => d.style.bottom)
    expect(segments).toHaveLength(2)
    expect(segments[0].style.height).toBe('50%')
  })

  it('every shape declares an aspect, so none can silently stretch', () => {
    for (const [name, s] of Object.entries(SHAPES)) {
      expect(s.aspect, `${name} has no aspect`).toBeGreaterThan(0)
    }
  })
})
