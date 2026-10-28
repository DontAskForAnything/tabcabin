import { Checkbox, cn } from '@tabcabin/ui'
import { useEffect, useRef } from 'react'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { ReminderChip } from '../../reminders/ReminderChip'
import { DoneBurst } from '../done/DoneBurst'
import { flyAway } from '../done/flyAway'
import { useJustDone } from '../done/justDone'
import type { ItemViewProps } from '../ItemView'
import { selectedRing, useSelectable } from './selection'
import { NoteEditor } from './NoteEditor'
import { noteColors } from './noteColors'

export function NoteItem({ item, group, actions }: ItemViewProps) {
  const t = useT()
  const editing = useUi((s) => s.editingNoteId === item.id)
  const setEditing = useUi((s) => s.setEditingNote)
  const { selected, onClickCapture } = useSelectable(item.id, group.id)
  const reminder = group.reminders[item.id]
  const phase = useJustDone((s) => s.phases[item.id])
  // Shows as done from the click on, before the change is saved.
  const done = item.done || phase !== undefined
  const root = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  // Once crossed out, a ticked-off to-do flies into the group's finished ones.
  useEffect(() => {
    if (phase !== 'leaving' || !root.current || !body.current) return
    const row = root.current.closest<HTMLElement>('[data-dnd-item]') ?? root.current
    return flyAway(row, body.current, group.id)
  }, [phase, group.id])

  const tick = (checked: boolean) => {
    // Before saving, so the list keeps the to-do while it animates.
    if (checked) useJustDone.getState().tickOff(item.id)
    else useJustDone.getState().forget(item.id)
    void actions.updateItem(item.id, { done: checked })
  }

  return (
    <div ref={root} className={cn('flex flex-col gap-1', reminder && 'pb-0.5')}>
      <div className={cn('flex items-start gap-2.5 rounded-xl', selected && selectedRing)}>
        {item.todo && (
          <span className="relative mt-2 flex dense:mt-1.5">
            <Checkbox
              className={cn(phase === 'striking' && 'done-pop')}
              checked={done}
              label={done ? t('note.markUndone') : t('note.markDone')}
              onCheckedChange={tick}
            />
            {phase === 'striking' && <DoneBurst />}
          </span>
        )}
        {editing ? (
          <NoteEditor item={item} group={group} actions={actions} />
        ) : (
          <div
            ref={body}
            role="button"
            tabIndex={0}
            onClickCapture={onClickCapture}
            onClick={() => setEditing(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setEditing(item.id)
            }}
            style={item.todo && !item.color ? undefined : noteColors(item.color)}
            className={cn(
              'min-h-[40px] min-w-0 flex-1 cursor-text rounded-xl px-[13px] py-[9px] dense:min-h-[32px] dense:py-[5px] text-[14px] leading-[1.5] break-words whitespace-pre-line outline-none transition-colors duration-300',
              item.todo && !item.color && 'bg-subtle',
              done && 'text-ink-3',
              !item.text && 'text-ink-3',
            )}
          >
            <span className={cn(done && 'todo-strike', phase === 'striking' && 'todo-strike-draw')}>
              {item.text || t('note.placeholder')}
            </span>
          </div>
        )}
      </div>
      {reminder && (
        <ReminderChip reminder={reminder} className={cn('self-start', item.todo && 'ml-[30px]')} />
      )}
    </div>
  )
}
