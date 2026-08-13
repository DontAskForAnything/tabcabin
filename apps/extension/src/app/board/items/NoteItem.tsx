import { Link2 } from 'lucide-react'
import {
  applyNoteShortcuts,
  displayHost,
  looksLikeImageUrl,
  looksLikeUrl,
  NOTE_MAX_LENGTH,
  withProtocol,
} from '@tabhangar/core'
import { Checkbox, cn, Textarea, toast } from '@tabhangar/ui'
import { useEffect, useRef, useState } from 'react'
import { convertNote } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import type { ItemViewProps } from '../ItemView'
import { onNoteInsert } from './noteEvents'
import { selectedRing, useSelectable } from './selection'

export function noteColors(color: string | null) {
  return color
    ? { background: `var(--note-${color}-bg)`, color: `var(--note-${color}-ink)` }
    : { background: 'var(--subtle)', color: 'var(--ink)' }
}

export function NoteItem({ item, group, actions }: ItemViewProps) {
  const t = useT()
  const editing = useUi((s) => s.editingNoteId === item.id)
  const setEditing = useUi((s) => s.setEditingNote)
  const { selected, onClickCapture } = useSelectable(item.id, group.id)

  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl', selected && selectedRing)}>
      {item.todo && (
        <Checkbox
          className="mt-2"
          checked={item.done}
          label={item.done ? t('note.markUndone') : t('note.markDone')}
          onCheckedChange={(done) => void actions.updateItem(item.id, { done })}
        />
      )}
      {editing ? (
        <NoteEditor item={item} group={group} actions={actions} />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClickCapture={onClickCapture}
          onClick={() => setEditing(item.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setEditing(item.id)
          }}
          style={item.todo && !item.color ? undefined : noteColors(item.color)}
          className={cn(
            'min-h-[40px] min-w-0 flex-1 cursor-text rounded-xl px-[13px] py-[9px] text-[14px] leading-[1.5] break-words whitespace-pre-line outline-none',
            item.todo && !item.color && 'bg-subtle',
            item.done && 'text-ink-3 line-through',
            !item.text && 'text-ink-4',
          )}
        >
          {item.text || t('note.placeholder')}
        </div>
      )}
    </div>
  )
}

function NoteEditor({ item, group, actions }: Pick<ItemViewProps, 'item' | 'group' | 'actions'>) {
  const t = useT()
  const setEditing = useUi((s) => s.setEditingNote)
  const [value, setValue] = useState(item.text)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const saved = useRef(item.text)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warned = useRef(false)

  const flush = (text = ref.current?.value ?? value) => {
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

  const change = (raw: string) => {
    let next = raw
    if (next.length > NOTE_MAX_LENGTH) {
      next = next.slice(0, NOTE_MAX_LENGTH)
      if (!warned.current)
        toast({ title: t('note.tooLong', { max: NOTE_MAX_LENGTH }), tone: 'info' })
      warned.current = true
    }
    const parsed = applyNoteShortcuts(next)
    if (parsed.todo !== undefined || parsed.done !== undefined) {
      void actions.updateItem(item.id, {
        ...(parsed.todo !== undefined ? { todo: parsed.todo } : {}),
        ...(parsed.done !== undefined ? { done: parsed.done } : {}),
      })
    }
    setValue(parsed.text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(parsed.text), 400)
  }

  const finish = () => {
    const text = (ref.current?.value ?? value).trim() ? (ref.current?.value ?? value) : ''
    if (!text.trim()) {
      if (timer.current) clearTimeout(timer.current)
      void actions.removeEmptyNote(item.id)
      if (item.text || saved.current) toast({ title: t('note.emptyRemoved'), tone: 'info' })
    } else flush(text.replace(/\s+$/, ''))
    if (useUi.getState().editingNoteId === item.id) setEditing(null)
  }

  const trimmed = value.trim()
  const urlLike = looksLikeUrl(trimmed)

  return (
    <div className="min-w-0 flex-1">
      <div
        style={noteColors(item.color)}
        className="rounded-xl px-[13px] py-[9px] shadow-[0_0_0_2px_var(--focus)]"
      >
        <Textarea
          ref={ref}
          value={value}
          placeholder={t('note.placeholder')}
          onChange={(event) => change(event.target.value)}
          onBlur={finish}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && value.endsWith('\n')) {
              event.preventDefault()
              const text = value.replace(/\n+$/, '')
              setValue(text)
              flush(text)
              void actions.addNote(group.id, { afterId: item.id }, item.todo)
            } else if (event.key === 'Escape') {
              event.preventDefault()
              ref.current?.blur()
            } else if (event.key === 'Delete' && event.shiftKey) {
              event.preventDefault()
              if (timer.current) clearTimeout(timer.current)
              setEditing(null)
              void actions.deleteItems([item.id])
            }
          }}
          className={cn('text-[14px] text-inherit', item.done && 'line-through opacity-70')}
        />
      </div>
      {urlLike && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const url = withProtocol(trimmed)
            if (timer.current) clearTimeout(timer.current)
            setEditing(null)
            void convertNote(
              item.id,
              looksLikeImageUrl(trimmed) ? 'image' : 'link',
              url,
              displayHost(url),
            )
          }}
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-ink"
        >
          <Link2 size={13} />
          {t('note.looksLikeUrl')} ·{' '}
          {looksLikeImageUrl(trimmed) ? t('note.turnIntoImage') : t('note.turnIntoLink')}
        </button>
      )}
    </div>
  )
}
