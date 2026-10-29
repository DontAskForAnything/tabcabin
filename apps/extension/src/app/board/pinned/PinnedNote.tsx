import { cn } from '@tabcabin/ui'
import type { BoardGroup, BoardItem } from '@/db/hooks'
import { useUi } from '@/state/ui'
import { ReminderChip } from '../../reminders/ReminderChip'
import type { BoardActions } from '../actions'
import { noteColors } from '../items/noteColors'
import { selectedRing, useSelectable } from '../items/selection'
import { PinnedBody, type PinnedSize } from './PinnedBody'
import { PinnedNoteEditor } from './PinnedNoteEditor'

/** A note pinned to a link: a note of its own that can be ticked, edited, moved or taken off. */
export function PinnedNote({
  item,
  group,
  actions,
  size,
}: {
  item: BoardItem
  group: BoardGroup
  actions: BoardActions
  size: PinnedSize
}) {
  const editing = useUi((s) => s.editingNoteId === item.id)
  const setEditing = useUi((s) => s.setEditingNote)
  const { selected, onClickCapture } = useSelectable(item.id, group.id)
  const reminder = group.reminders[item.id]
  if (editing) return <PinnedNoteEditor item={item} actions={actions} size={size} />
  return (
    <div
      onClickCapture={onClickCapture}
      className={cn('flex flex-col gap-1 rounded-[10px]', selected && selectedRing)}
    >
      <PinnedBody
        text={item.text}
        style={noteColors(item.color)}
        todo={item.todo}
        done={item.done}
        size={size}
        onTick={(done) => void actions.updateItem(item.id, { done })}
        onEdit={() => setEditing(item.id)}
        onUnpin={(from) => void actions.unpinNotes([item.id], from)}
      />
      {reminder && <ReminderChip reminder={reminder} className="self-start" />}
    </div>
  )
}
