import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

const SLOT_CLASSES =
  'relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md'

function Harness({ onChange = () => {}, ...props }) {
  const [value, setValue] = React.useState('')
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={next => { setValue(next); onChange(next) }}
      autoFocus
      autoComplete="one-time-code"
      {...props}
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} data-testid={`slot-${i}`} />)}
      </InputOTPGroup>
    </InputOTP>
  )
}

const input = () => document.querySelector('input')

describe('OTP structure parity', () => {
  it('renders six slots carrying the baseline classes', () => {
    render(<Harness />)
    for (let i = 0; i < 6; i++) {
      const slot = screen.getByTestId(`slot-${i}`)
      for (const token of SLOT_CLASSES.split(' ')) {
        expect(slot.className.split(' ')).toContain(token)
      }
    }
  })

  it('gives the container its baseline classes', () => {
    const { container } = render(<Harness />)
    const tokens = container.firstChild.className.split(' ')
    for (const token of ['flex', 'items-center', 'gap-2', 'has-[:disabled]:opacity-50']) {
      expect(tokens).toContain(token)
    }
  })

  it('exposes one real input carrying the OTP attributes', () => {
    render(<Harness />)
    expect(input()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(input()).toHaveAttribute('maxlength', '6')
    expect(input()).toHaveAttribute('inputmode', 'numeric')
  })
})

describe('OTP behaviour', () => {
  it('typing fills slots left to right', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '123')
    expect(screen.getByTestId('slot-0')).toHaveTextContent('1')
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2')
    expect(screen.getByTestId('slot-2')).toHaveTextContent('3')
    expect(screen.getByTestId('slot-3')).toHaveTextContent('')
  })

  it('reports each change to onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(input(), '12')
    expect(onChange).toHaveBeenLastCalledWith('12')
  })

  it('backspace clears the last digit', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '123')
    await user.type(input(), '{backspace}')
    expect(screen.getByTestId('slot-2')).toHaveTextContent('')
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2')
  })

  it('rejects non-digits', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), 'a1b2')
    expect(screen.getByTestId('slot-0')).toHaveTextContent('1')
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2')
  })

  it('stops at maxLength', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.type(input(), '1234567890')
    expect(onChange).toHaveBeenLastCalledWith('123456')
  })

  it('paste fills every slot', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    input().focus()
    await user.paste('654321')
    expect(screen.getByTestId('slot-0')).toHaveTextContent('6')
    expect(screen.getByTestId('slot-5')).toHaveTextContent('1')
  })

  it('marks the caret slot active and the rest inactive', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '12')
    expect(screen.getByTestId('slot-2').className).toContain('ring-1')
    expect(screen.getByTestId('slot-0').className).not.toContain('ring-1')
  })

  it('shows the fake caret only in the active empty slot', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '1')
    expect(screen.getByTestId('slot-1').querySelector('.animate-caret-blink')).toBeTruthy()
    expect(screen.getByTestId('slot-0').querySelector('.animate-caret-blink')).toBeFalsy()
  })

  it('drops the active ring on blur', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '1')
    await user.tab()
    expect(screen.getByTestId('slot-1').className).not.toContain('ring-1')
  })
})

describe('OTP behaviour regressions (fix round 1)', () => {
  it('pasting a value containing a non-digit rejects the paste entirely', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    input().focus()
    await user.paste('12a456')
    expect(input().value).toBe('')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('typing a non-digit mid-value leaves the value and selection unchanged', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const el = input()
    await user.type(el, '1234')
    await user.type(el, 'a', { initialSelectionStart: 2, initialSelectionEnd: 2 })
    expect(el.value).toBe('1234')
    expect(el.selectionStart).toBe(2)
    expect(el.selectionEnd).toBe(2)
  })

  it('typing after moving the caret left inserts at the caret and the ring follows the real insertion point', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const el = input()
    await user.type(el, '12{arrowleft}3')
    expect(el.value).toBe('132')
    expect(screen.getByTestId('slot-2').className).toContain('ring-1')
    expect(screen.getByTestId('slot-1').className).not.toContain('ring-1')
  })

  it('marks every slot in a range selection as active', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const el = input()
    await user.type(el, '123456')
    el.setSelectionRange(1, 4)
    fireEvent.keyUp(el)
    expect(screen.getByTestId('slot-0').className).not.toContain('ring-1')
    expect(screen.getByTestId('slot-1').className).toContain('ring-1')
    expect(screen.getByTestId('slot-2').className).toContain('ring-1')
    expect(screen.getByTestId('slot-3').className).toContain('ring-1')
    expect(screen.getByTestId('slot-4').className).not.toContain('ring-1')
  })

  it('gives the active empty slot the exact ring, z-index and caret classes', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), '1')
    const activeSlot = screen.getByTestId('slot-1')
    const activeTokens = activeSlot.className.split(' ')
    for (const token of ['z-10', 'ring-1', 'ring-ring']) {
      expect(activeTokens).toContain(token)
    }
    const caretDiv = activeSlot.querySelector('.animate-caret-blink')
    const caretTokens = caretDiv.className.split(' ')
    for (const token of ['h-4', 'w-px', 'animate-caret-blink', 'bg-foreground', 'duration-1000']) {
      expect(caretTokens).toContain(token)
    }
    const wrapperTokens = caretDiv.parentElement.className.split(' ')
    for (const token of ['pointer-events-none', 'absolute', 'inset-0', 'flex', 'items-center', 'justify-center']) {
      expect(wrapperTokens).toContain(token)
    }
  })
})
