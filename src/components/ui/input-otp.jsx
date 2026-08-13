import * as React from "react"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const InputOTPContext = React.createContext({ slots: [] })

const InputOTP = React.forwardRef((
  {
    className,
    containerClassName,
    maxLength = 6,
    value = "",
    onChange,
    children,
    ...props
  },
  ref
) => {
  const innerRef = React.useRef(null)
  // The most recent selection the input actually had, so a rejected
  // keystroke can restore exactly where the user was.
  const lastGoodSelectionRef = React.useRef({ start: 0, end: 0 })
  const [isFocused, setIsFocused] = React.useState(false)
  const [selection, setSelection] = React.useState({ start: 0, end: 0 })

  React.useImperativeHandle(ref, () => innerRef.current)

  // A caret index can sit one past the last digit, but never past the final slot.
  const clampCaret = (position) =>
    Math.max(0, Math.min(position ?? 0, maxLength - 1))
  // A selection's exclusive upper bound may reach maxLength itself.
  const clampBound = (position) =>
    Math.max(0, Math.min(position ?? 0, maxLength))

  const syncCaret = () => {
    const node = innerRef.current
    if (!node) return
    const start = node.selectionStart ?? 0
    const end = node.selectionEnd ?? start
    setSelection({ start, end })
    lastGoodSelectionRef.current = { start, end }
  }

  const handleChange = (event) => {
    const raw = event.target.value
    if (/\D/.test(raw)) {
      // Reject the change wholesale rather than compacting it: restore the
      // committed value and the selection the input had before this
      // keystroke, and never call onChange for a rejected change.
      const { start, end } = lastGoodSelectionRef.current
      event.target.value = value
      event.target.setSelectionRange(start, end)
      setSelection({ start, end })
      return
    }
    const next = raw.slice(0, maxLength)
    onChange?.(next)
    // Selection lands at the real insertion point, not just after the
    // last digit, so a mid-value edit doesn't teleport the caret to the end.
    const caretPos = clampCaret(event.target.selectionStart)
    setSelection({ start: caretPos, end: caretPos })
    lastGoodSelectionRef.current = { start: caretPos, end: caretPos }
  }

  const slots = Array.from({ length: maxLength }, (_, index) => {
    const { start, end } = selection
    const isRange = end > start
    const char = value[index] ?? null
    const isActive = isFocused && (
      isRange
        ? index >= clampBound(start) && index < clampBound(end)
        : index === clampCaret(Math.min(value.length, start))
    )
    return { char, isActive, hasFakeCaret: isActive && char === null && !isRange }
  })

  return (
    <InputOTPContext.Provider value={{ slots }}>
      <div className={cn("relative flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}>
        {children}
        <input
          ref={innerRef}
          value={value}
          onChange={handleChange}
          onSelect={syncCaret}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onFocus={() => { setIsFocused(true); syncCaret() }}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength}
          inputMode="numeric"
          pattern="[0-9]*"
          className={cn(
            "absolute inset-0 h-full w-full cursor-default bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed",
            className
          )}
          {...props} />
      </div>
    </InputOTPContext.Provider>
  );
})
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(InputOTPContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] ?? {}

  return (
    (<div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...props}>
      {char}
      {hasFakeCaret && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>)
  );
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
