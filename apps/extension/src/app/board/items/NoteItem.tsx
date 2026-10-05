import { Checkbox, cn } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { ReminderChip } from '../../reminders/ReminderChip'
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

  return (
    <div className={cn('flex flex-col gap-1', reminder && 'pb-0.5')}>
      <div className={cn('flex items-start gap-2.5 rounded-xl', selected && selectedRing)}>
        {item.todo && (
          <Checkbox
            className="mt-2 dense:mt-1.5"
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
              'min-h-[40px] min-w-0 flex-1 cursor-text rounded-xl px-[13px] py-[9px] dense:min-h-[32px] dense:py-[5px] text-[14px] leading-[1.5] break-words whitespace-pre-line outline-none',
              item.todo && !item.color && 'bg-subtle',
              item.done && 'text-ink-3 line-through',
              !item.text && 'text-ink-3',
            )}
          >
            {item.text || t('note.placeholder')}
          </div>
        )}
      </div>
      {reminder && (
        <ReminderChip reminder={reminder} className={cn('self-start', item.todo && 'ml-[30px]')} />
      )}
    </div>
  )
}
