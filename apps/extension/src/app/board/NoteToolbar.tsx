import { Check, ClipboardCopy, FaceSlightlySmiling, ListTodo, Palette, Trash } from 'lucide-react'
import { NOTE_COLORS, type NoteColor } from '@tabhangar/core'
import {
  cn,
  EmojiPickerPanel,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
  Tooltip,
} from '@tabhangar/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'motion/react'
import type { MouseEvent, ReactNode } from 'react'
import { db } from '@/db/db'
import { deleteItems, updateItem } from '@/db/repo'
import { useT } from '@/i18n'
import { copyText, emojiBaseUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { insertIntoNote } from './items/noteEvents'

const keepFocus = (event: MouseEvent) => event.preventDefault()

/** Docked toolbar shown while a note is being edited. */
export function NoteToolbar() {
  const t = useT()
  const editingId = useUi((s) => s.editingNoteId)
  const setEditing = useUi((s) => s.setEditingNote)
  const note = useLiveQuery(() => (editingId ? db.items.get(editingId) : undefined), [editingId])

  return (
    <AnimatePresence>
      {editingId && note && (
        <motion.div
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 12, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          onMouseDown={keepFocus}
          className="fixed bottom-6 left-1/2 z-40 flex items-center gap-1 rounded-2xl bg-card p-1.5 shadow-pop"
        >
          <ToolButton
            label={t('note.todo')}
            active={note.todo}
            icon={<ListTodo size={16} />}
            onClick={() => void updateItem(note.id, { todo: !note.todo, done: false })}
          />
          <Popover>
            <PopoverTrigger asChild>
              <span>
                <ToolButton
                  label={t('note.color')}
                  icon={<Palette size={16} />}
                  active={!!note.color}
                />
              </span>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              className="p-2.5"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onMouseDown={keepFocus}
            >
              <div className="flex gap-1.5">
                <Swatch
                  label={t('note.noColor')}
                  color={null}
                  active={!note.color}
                  onPick={() => void updateItem(note.id, { color: null })}
                />
                {NOTE_COLORS.map((color) => (
                  <Swatch
                    key={color}
                    label={color}
                    color={color}
                    active={note.color === color}
                    onPick={() => void updateItem(note.id, { color })}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <span>
                <ToolButton label={t('note.emoji')} icon={<FaceSlightlySmiling size={16} />} />
              </span>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              className="p-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <EmojiPickerPanel
                emojibaseUrl={emojiBaseUrl()}
                onSelect={(emoji) => insertIntoNote(emoji)}
              />
            </PopoverContent>
          </Popover>
          <ToolButton
            label={t('note.copy')}
            icon={<ClipboardCopy size={16} />}
            onClick={() =>
              void copyText(note.text).then(
                (ok) => ok && toast({ title: t('note.copied'), tone: 'success' }),
              )
            }
          />
          <ToolButton
            label={t('note.delete')}
            icon={<Trash size={16} />}
            onClick={() => {
              setEditing(null)
              void deleteItems([note.id])
            }}
          />
          <span className="mx-1 h-6 w-px bg-line" />
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="flex h-9 items-center gap-1.5 rounded-[11px] bg-accent px-3.5 text-[13px] font-semibold text-on-accent shadow-glow"
          >
            <Check size={15} strokeWidth={2.6} />
            {t('common.done')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ToolButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string
  icon: ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <IconButton
      label={label}
      icon={icon}
      onClick={onClick}
      onMouseDown={keepFocus}
      variant={active ? 'accent' : 'plain'}
      className={cn('size-9 rounded-[11px]', !active && 'text-ink-2')}
    />
  )
}

function Swatch({
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
