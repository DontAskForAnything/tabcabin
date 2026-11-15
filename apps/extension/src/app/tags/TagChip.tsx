import type { Tag } from '@tabcabin/core'
import { cn } from '@tabcabin/ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** A tag as a small pill in its colour; with `onRemove` it gets a × to take it off. */
export function TagChip({
  tag,
  onRemove,
  removeLabel,
  className,
  children,
}: {
  tag: Pick<Tag, 'name' | 'color'>
  onRemove?: () => void
  removeLabel?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <span
      data-tag-chip
      className={cn(
        'inline-flex h-[18px] max-w-[140px] flex-none items-center gap-1 rounded-full pr-2 pl-1.5 text-[11px] leading-none font-[560]',
        onRemove && 'pr-1',
        className,
      )}
      style={{ background: `var(--note-${tag.color}-bg)`, color: `var(--note-${tag.color}-ink)` }}
    >
      <span aria-hidden className="size-[5px] flex-none rounded-full bg-current opacity-60" />
      <span className="truncate">{children ?? tag.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="flex size-3.5 items-center justify-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100"
        >
          <X size={10} strokeWidth={2.6} />
        </button>
      )}
    </span>
  )
}
