import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastProvider } from '@/components/ui/toast'

const TOAST_BASE_TOKENS = [
  'group', 'pointer-events-auto', 'relative', 'flex', 'w-full', 'items-center',
  'justify-between', 'space-x-4', 'overflow-hidden', 'rounded-md', 'border',
  'p-6', 'pr-8', 'shadow-lg', 'transition-all',
  'data-[state=open]:animate-in', 'data-[state=closed]:animate-out',
  'data-[state=closed]:slide-out-to-right-full',
]

describe('Toast class parity', () => {
  it('keeps the baseline base classes', () => {
    render(<Toast data-testid="toast" />)
    const tokens = screen.getByTestId('toast').className.split(' ')
    for (const token of TOAST_BASE_TOKENS) expect(tokens).toContain(token)
  })

  it('applies the default variant', () => {
    render(<Toast data-testid="toast" />)
    const tokens = screen.getByTestId('toast').className.split(' ')
    for (const token of ['bg-background', 'text-foreground']) expect(tokens).toContain(token)
  })

  it('applies the destructive variant', () => {
    render(<Toast variant="destructive" data-testid="toast" />)
    const tokens = screen.getByTestId('toast').className.split(' ')
    for (const token of ['destructive', 'group', 'border-destructive', 'bg-destructive', 'text-destructive-foreground']) {
      expect(tokens).toContain(token)
    }
  })

  it('keeps the fixed viewport container classes', () => {
    render(<ToastProvider data-testid="provider" />)
    const tokens = screen.getByTestId('provider').className.split(' ')
    for (const token of ['fixed', 'top-0', 'z-[100]', 'flex', 'max-h-screen', 'w-full', 'flex-col-reverse', 'p-4', 'md:max-w-[420px]']) {
      expect(tokens).toContain(token)
    }
  })

  it('renders title and description with their classes', () => {
    render(
      <Toast>
        <ToastTitle>Check your email</ToastTitle>
        <ToastDescription>We sent a code.</ToastDescription>
      </Toast>
    )
    expect(screen.getByText('Check your email').className).toBe('text-sm font-semibold')
    expect(screen.getByText('We sent a code.').className).toBe('text-sm opacity-90')
  })

  it('keeps the toast-close attribute the eslint config whitelists', () => {
    render(<ToastClose data-testid="close" />)
    expect(screen.getByTestId('close')).toHaveAttribute('toast-close')
  })
})
