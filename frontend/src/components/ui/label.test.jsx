import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '@/components/ui/label'

const BASELINE = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'

describe('Label', () => {
  it('renders a native label with the baseline classes', () => {
    render(<Label htmlFor="email">Email</Label>)
    const label = screen.getByText('Email')
    expect(label.tagName).toBe('LABEL')
    expect(label.className).toBe(BASELINE)
  })

  it('associates with its control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('merges a caller className', () => {
    render(<Label htmlFor="a" className="mb-2">Email</Label>)
    expect(screen.getByText('Email').className).toContain('mb-2')
  })
})
