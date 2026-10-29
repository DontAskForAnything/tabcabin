import { applyTypedNoteShortcuts, type Item, NOTE_MAX_LENGTH } from '@tabcabin/core'
import { cn } from '@tabcabin/ui'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import type { BoardActions } from '../actions'
import { onNoteInsert } from '../items/noteEvents'
import { noteColors } from '../items/noteColors'
import { pinnedBox, type PinnedSize } from './PinnedBody'

/**
 * Edits a pinned note in place, with the note toolbar docked below. It saves as you type; Enter
 * or a click elsewhere finishes (Shift+Enter starts a new line), and a note left empty goes away.
 */
export function PinnedNoteEditor({
  item,
  actions,
  size,
}: {
  item: Item
  actions: BoardActions
  size: PinnedSize
}) {
  const t = useT()
  const [value, setValue] = useState(item.text)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const saved = useRef(item.text)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = (text: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (text !== saved.current) {
      saved.current = text
      void actions.updateItem(item.id, { text })
    }
  }

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
    return onNoteInsert((text) => {
      const target = ref.current
      if (!target) return
      const start = target.selectionStart
      const next = target.value.slice(0, start) + text + target.value.slice(target.selectionEnd)
      setValue(next)
      requestAnimationFrame(() => {
        target.focus()
        target.setSelectionRange(start + text.length, start + text.length)
      })
      flush(next)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const change = (raw: string, caret: number) => {
    const next = raw.slice(0, NOTE_MAX_LENGTH)
    const parsed = applyTypedNoteShortcuts(next, Math.min(caret, next.length))
    if (parsed.todo !== undefined || parsed.done !== undefined) {
      void actions.updateItem(item.id, {
        ...(parsed.todo !== undefined ? { todo: parsed.todo } : {}),
        ...(parsed.done !== undefined ? { done: parsed.done } : {}),
      })
      requestAnimationFrame(() => ref.current?.setSelectionRange(parsed.caret, parsed.caret))
    }
    setValue(parsed.text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(parsed.text), 400)
  }

  const finish = () => {
    const text = (ref.current?.value ?? value).trim()
    if (!text) {
      if (timer.current) clearTimeout(timer.current)
      void actions.removeEmptyNote(item.id)
    } else flush(text)
    if (useUi.getState().editingNoteId === item.id) useUi.getState().setEditingNote(null)
  }

  return (
    <div
      style={noteColors(item.color)}
      className={cn('shadow-[0_0_0_2px_var(--focus)]', pinnedBox[size])}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label={t('editor.comment')}
        placeholder={t('link.notePlaceholder')}
        onChange={(event) => change(event.target.value, event.target.selectionStart)}
        onBlur={finish}
        // Selecting text must not start dragging the link around it.
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Escape') {
            event.preventDefault()
            ref.current?.blur()
          }
        }}
        className={cn(
          'block min-h-[1.4em] w-full resize-none bg-transparent outline-none field-sizing-content placeholder:text-current placeholder:opacity-55',
          item.done && 'line-through opacity-70',
        )}
      />
    </div>
  )
}
