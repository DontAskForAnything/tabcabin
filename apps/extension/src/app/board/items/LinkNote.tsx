import { applyTypedNoteShortcuts, type Item, NOTE_MAX_LENGTH } from '@tabcabin/core'
import { Checkbox, cn } from '@tabcabin/ui'
import { type CSSProperties, useRef, useState } from 'react'
import { useT } from '@/i18n'
import type { BoardActions } from '../actions'
import '../done/done.css'

/**
 * The note pinned to a link, in its note colour; a to-do note has a checkbox. Given
 * `onEditingChange`, a click on the text edits it in place.
 */
export function LinkNote({
  item,
  actions,
  editing = false,
  onEditingChange,
  className,
}: {
  item: Item
  actions: BoardActions
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  className?: string
}) {
  const t = useT()
  const style: CSSProperties = {
    background: `var(--note-${item.color ?? 'sky'}-bg)`,
    color: `var(--note-${item.color ?? 'sky'}-ink)`,
  }
  const box = cn(
    'flex items-start gap-2 rounded-[9px] px-2.5 py-1.5 text-[12.5px] leading-snug',
    className,
  )
  if (editing)
    return (
      <div className={box} style={style}>
        <LinkNoteEditor item={item} actions={actions} onDone={() => onEditingChange?.(false)} />
      </div>
    )
  if (!item.text) return null
  return (
    <div className={box} style={style}>
      {item.todo && (
        <Checkbox
          size="sm"
          className="mt-px border-ink-3 bg-card/60"
          checked={item.done}
          label={item.done ? t('note.markUndone') : t('note.markDone')}
          onCheckedChange={(done) => void actions.updateItem(item.id, { done })}
        />
      )}
      <span
        role={onEditingChange ? 'button' : undefined}
        tabIndex={onEditingChange ? 0 : undefined}
        onClick={() => onEditingChange?.(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEditingChange) onEditingChange(true)
        }}
        className={cn(
          'line-clamp-3 min-w-0 flex-1 whitespace-pre-line outline-none',
          onEditingChange && 'cursor-text',
          item.done && 'opacity-70',
        )}
      >
        <span className={cn(item.done && 'todo-strike')}>{item.text}</span>
      </span>
    </div>
  )
}

/** Saves on Enter or when it loses focus; Shift+Enter starts a new line, Escape cancels. */
function LinkNoteEditor({
  item,
  actions,
  onDone,
}: {
  item: Item
  actions: BoardActions
  onDone: () => void
}) {
  const t = useT()
  const [draft, setDraft] = useState(item.text)
  const finished = useRef(false)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  // "/todo" and the other note commands work here too; they apply on save.
  const flags = useRef<{ todo?: boolean; done?: boolean }>({})

  const change = (raw: string, caret: number) => {
    const next = applyTypedNoteShortcuts(raw, caret)
    if (next.todo !== undefined || next.done !== undefined) {
      flags.current = {
        ...flags.current,
        ...(next.todo !== undefined && { todo: next.todo }),
        ...(next.done !== undefined && { done: next.done }),
      }
      requestAnimationFrame(() => ref.current?.setSelectionRange(next.caret, next.caret))
    }
    setDraft(next.text)
  }

  const save = () => {
    if (finished.current) return
    finished.current = true
    const { todo, done } = flags.current
    const text = draft.trim().slice(0, NOTE_MAX_LENGTH).trim()
    const patch = text
      ? {
          text,
          ...(todo !== undefined && { todo }),
          ...(done !== undefined && { done }),
        }
      : { text: '', todo: false, done: false }
    if (text !== item.text || todo !== undefined || done !== undefined)
      void actions.updateItem(item.id, patch)
    onDone()
  }

  return (
    <textarea
      ref={ref}
      autoFocus
      rows={1}
      value={draft}
      aria-label={t('editor.comment')}
      placeholder={t('link.notePlaceholder')}
      onChange={(event) => change(event.target.value, event.target.selectionStart)}
      onBlur={save}
      // Typing and selecting text must not start dragging the link.
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          save()
        } else if (event.key === 'Escape') {
          finished.current = true
          onDone()
        }
      }}
      className="min-h-[1.4em] w-full resize-none bg-transparent outline-none field-sizing-content placeholder:text-current placeholder:opacity-55"
    />
  )
}
