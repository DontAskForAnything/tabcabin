import type { NoteColor } from '@tabcabin/core'
import { cn, Tooltip } from '@tabcabin/ui'
import { keepFocus } from './keepFocus'

export function Swatch({
  label,
  color,
  active,
  onPick,
}: {
  label: string
  color: NoteColor | null
  active: boolean
  onPick: () => void
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onMouseDown={keepFocus}
        onClick={onPick}
        className={cn(
          'size-7 rounded-[9px] shadow-[inset_0_0_0_1px_rgb(20_24_40/0.1)] transition-transform hover:scale-110',
          active && 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]',
        )}
        style={{ background: color ? `var(--note-${color}-bg)` : 'var(--subtle)' }}
      />
    </Tooltip>
  )
}
