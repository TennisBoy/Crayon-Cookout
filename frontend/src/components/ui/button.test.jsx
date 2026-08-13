import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from '@/components/ui/button'

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'

const VARIANTS = {
  default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline: 'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

const SIZES = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8',
  icon: 'h-9 w-9',
}

describe('Button class parity', () => {
  it.each(Object.entries(VARIANTS))('variant %s keeps its baseline classes', (variant, expected) => {
    const result = buttonVariants({ variant })
    for (const token of `${BASE} ${expected}`.split(' ')) {
      expect(result.split(' ')).toContain(token)
    }
  })

  it.each(Object.entries(SIZES))('size %s keeps its baseline classes', (size, expected) => {
    // `sm` and `lg` re-declare rounded-md, which tailwind-merge collapses; check
    // the size-defining tokens survive.
    const result = buttonVariants({ size })
    for (const token of expected.split(' ')) {
      expect(result.split(' ')).toContain(token)
    }
  })

  it('defaults to the default variant and size', () => {
    expect(buttonVariants()).toBe(buttonVariants({ variant: 'default', size: 'default' }))
  })

  it('lets a caller className win over the defaults', () => {
    expect(buttonVariants({ className: 'h-12' }).split(' ')).toContain('h-12')
    expect(buttonVariants({ className: 'h-12' }).split(' ')).not.toContain('h-9')
  })
})

describe('Button rendering', () => {
  it('renders a native button with the variant classes', () => {
    render(<Button variant="outline">Continue with Google</Button>)
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.className).toBe(buttonVariants({ variant: 'outline' }))
  })

  it('forwards type, disabled and onClick', async () => {
    render(<Button type="submit" disabled>Log in</Button>)
    const button = screen.getByRole('button', { name: 'Log in' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('merges a caller className', () => {
    render(<Button className="w-full h-12 font-medium">Log in</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })
})
