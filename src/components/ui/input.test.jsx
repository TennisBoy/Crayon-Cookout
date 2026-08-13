import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders a native input', () => {
    render(<Input placeholder="you@example.com" />)
    expect(screen.getByPlaceholderText('you@example.com').tagName).toBe('INPUT')
  })

  it('carries the design-system classes', () => {
    render(<Input placeholder="x" />)
    const className = screen.getByPlaceholderText('x').className
    for (const token of ['flex', 'h-9', 'w-full', 'rounded-md', 'border', 'border-input', 'bg-transparent', 'px-3', 'py-1', 'shadow-sm', 'focus-visible:ring-1', 'focus-visible:ring-ring']) {
      expect(className.split(' ')).toContain(token)
    }
  })

  it('lets the auth pages override height and padding', () => {
    render(<Input placeholder="x" className="pl-10 h-12" />)
    const tokens = screen.getByPlaceholderText('x').className.split(' ')
    expect(tokens).toContain('h-12')
    expect(tokens).toContain('pl-10')
    expect(tokens).not.toContain('h-9')
  })

  it('forwards type, autoComplete and required', () => {
    render(<Input type="email" autoComplete="email" required placeholder="x" />)
    const input = screen.getByPlaceholderText('x')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
    expect(input).toBeRequired()
  })

  it('is controllable', async () => {
    const user = userEvent.setup()
    let value = ''
    const { rerender } = render(
      <Input placeholder="x" value={value} onChange={e => { value = e.target.value }} />
    )
    await user.type(screen.getByPlaceholderText('x'), 'a')
    rerender(<Input placeholder="x" value={value} onChange={() => {}} />)
    expect(screen.getByPlaceholderText('x')).toHaveValue('a')
  })
})
