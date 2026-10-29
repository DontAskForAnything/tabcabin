import { cn } from '@tabcabin/ui'
import type { Item } from '@tabcabin/core'
import { useLinkTextDrag } from '../../dnd/hooks'
import type { BoardActions } from '../actions'
import { noteColors } from '../items/noteColors'
import { PinnedBody, type PinnedSize } from './PinnedBody'

/**
 * The note written on a link itself (in its editor, the save popover or an import). It looks and
 * works like a pinned note: editing, dragging or unpinning it first turns it into one.
 */
export function LinkText({
  link,
  actions,
  size,
}: {
  link: Item
  actions: BoardActions
  size: PinnedSize
}) {
  const { setNodeRef, handleProps, dragging } = useLinkTextDrag(link)
  return (
    <div
      ref={setNodeRef}
      {...handleProps}
      className={cn('transition-opacity duration-150', dragging && 'opacity-35')}
    >
      <PinnedBody
        text={link.text}
        // Sky blue unless it has a colour of its own, as it always looked.
        style={noteColors(link.color ?? 'sky')}
        todo={link.todo}
        done={link.done}
        size={size}
        onTick={(done) => void actions.updateItem(link.id, { done })}
        onEdit={() => void actions.editLinkText(link.id)}
        onUnpin={(from) => void actions.unpinLinkText(link.id, from)}
      />
    </div>
  )
}
