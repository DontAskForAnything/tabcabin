import { cn } from '@tabcabin/ui'
import { useEffect, useRef, useState } from 'react'

/** Edits a name in place: Enter or clicking away saves, Escape keeps the old name. */
export function InlineRename({
  initial,
  onDone,
  label,
  fitContent = false,
  className,
}: {
  initial: string
  onDone: (value: string) => void
  label?: string
  /** Grow with the text instead of filling the available width. */
  fitContent?: boolean
  className?: string
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      value={value}
      aria-label={label}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onDone(value.trim())}
      onKeyDown={(event) => {
        // Keep keys away from surrounding lists and menus while typing.
        event.stopPropagation()
        if (event.key === 'Enter') onDone(value.trim())
        if (event.key === 'Escape') onDone(initial)
      }}
      size={fitContent ? Math.max(6, value.length + 1) : undefined}
      className={cn('h-8 bg-card font-semibold text-ink shadow-tile outline-none', className)}
    />
  )
}
