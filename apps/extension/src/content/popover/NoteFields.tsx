import { ListTodo } from 'lucide-react'
import { NOTE_COLORS, type NoteColor } from '@tabhangar/core'
import { cn } from '@tabhangar/ui'
import type { RefObject } from 'react'
import type { Translate } from '@/i18n'

const SELECTED = 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]'

/** The sticky note for the page: text, colour and whether it is a to-do. */
export function NoteFields({
  note,
  color,
  todo,
  onNote,
  onColor,
  onTodo,
  textarea,
  t,
}: {
  note: string
  color: NoteColor | null
  todo: boolean
  onNote: (note: string) => void
  onColor: (color: NoteColor | null) => void
  onTodo: (todo: boolean) => void
  textarea: RefObject<HTMLTextAreaElement | null>
  t: Translate
}) {
  return (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-ink-3">
          {t('editor.comment')}
        </span>
        <textarea
          ref={textarea}
          rows={3}
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder={t('editor.commentPlaceholder')}
          style={
            color
              ? { background: `var(--note-${color}-bg)`, color: `var(--note-${color}-ink)` }
              : undefined
          }
          className="w-full resize-none rounded-xl bg-subtle px-3 py-2.5 text-[14px] leading-[1.45] text-ink outline-none placeholder:text-ink-3 focus:shadow-[0_0_0_2px_var(--focus)]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-label={t('note.noColor')}
          onClick={() => onColor(null)}
          className={cn(
            'size-[22px] rounded-[7px] bg-subtle shadow-[inset_0_0_0_1px_rgb(20_24_40/0.1)]',
            !color && SELECTED,
          )}
        />
        {NOTE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={t(`color.${c}`)}
            onClick={() => onColor(c)}
            style={{ background: `var(--note-${c}-bg)` }}
            className={cn('size-[22px] rounded-[7px]', color === c && SELECTED)}
          />
        ))}
        <div className="flex-1" />
        <button
          type="button"
          aria-pressed={todo}
          onClick={() => onTodo(!todo)}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold',
            todo ? 'bg-accent-soft text-accent-ink' : 'bg-subtle text-ink-2',
          )}
        >
          <ListTodo size={13} />
          {t('note.todo')}
        </button>
      </div>
    </>
  )
}
