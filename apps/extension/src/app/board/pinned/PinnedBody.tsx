import { Checkbox, cn, IconButton } from '@tabcabin/ui'
import { PinOff } from 'lucide-react'
import { type CSSProperties, useRef, useState } from 'react'
import { useT } from '@/i18n'
import '../done/done.css'

/** Notes under a link row on the board are a little larger than under a collections tile. */
export type PinnedSize = 'row' | 'tile'

export const pinnedBox: Record<PinnedSize, string> = {
  row: 'rounded-[10px] px-[11px] py-2 text-[13px] leading-[1.45]',
  tile: 'rounded-[9px] px-2.5 py-1.5 text-[12.5px] leading-snug',
}

/**
 * A note under a link: its colour, a checkbox for a to-do, the text (a click edits it) and, on
 * hover or focus, a pin in the corner that takes it off the link.
 */
export function PinnedBody({
  text,
  style,
  todo,
  done,
  size,
  onTick,
  onEdit,
  onUnpin,
}: {
  text: string
  style: CSSProperties
  todo: boolean
  done: boolean
  size: PinnedSize
  onTick: (done: boolean) => void
  onEdit: () => void
  /** Gets where the note is now, so it can glide from there. */
  onUnpin: (from: DOMRect) => void
}) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  // Ticked here (not loaded ticked): the checkbox pops and the line is drawn.
  const [ticked, setTicked] = useState(false)
  return (
    <div
      ref={box}
      style={style}
      className={cn('group/pin relative flex items-start gap-2', pinnedBox[size])}
    >
      {todo && (
        <Checkbox
          size="sm"
          className={cn('mt-px border-ink-3 bg-card/60', ticked && 'done-pop')}
          checked={done}
          label={done ? t('note.markUndone') : t('note.markDone')}
          onCheckedChange={(checked) => {
            setTicked(checked)
            onTick(checked)
          }}
        />
      )}
      <span
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEdit()
        }}
        className={cn(
          'min-w-0 flex-1 cursor-text break-words whitespace-pre-line outline-none',
          size === 'tile' && 'line-clamp-3',
          done && 'opacity-70',
          !text && 'opacity-55',
        )}
      >
        <span className={cn(done && 'todo-strike', done && ticked && 'todo-strike-draw')}>
          {text || t('link.notePlaceholder')}
        </span>
      </span>
      <IconButton
        label={t('link.unpin')}
        icon={<PinOff size={12} />}
        variant="tile"
        size="xs"
        className="absolute -top-2 -right-2 z-10 hidden group-focus-within/pin:inline-flex group-hover/pin:inline-flex"
        onClick={() => box.current && onUnpin(box.current.getBoundingClientRect())}
      />
    </div>
  )
}
