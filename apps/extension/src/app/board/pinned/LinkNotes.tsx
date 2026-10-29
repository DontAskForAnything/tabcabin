import { cn } from '@tabcabin/ui'
import type { BoardGroup, BoardItem } from '@/db/hooks'
import type { BoardActions } from '../actions'
import { ItemList } from '../ItemList'
import { LinkText } from './LinkText'
import type { PinnedSize } from './PinnedBody'
import { PinnedNote } from './PinnedNote'

/**
 * Everything under a link: the note written on it, then the notes pinned to it (as many as you
 * like, each dragged on its own: within the link, onto another one or off it).
 */
export function LinkNotes({
  link,
  group,
  actions,
  size,
  className,
}: {
  link: BoardItem
  group: BoardGroup
  actions: BoardActions
  size: PinnedSize
  className?: string
}) {
  if (!link.text && link.children.length === 0) return null
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {link.text && <LinkText link={link} actions={actions} size={size} />}
      {link.children.length > 0 && (
        <ItemList
          groupId={group.id}
          parentId={link.id}
          parentKind="link"
          items={link.children}
          className="min-h-0 gap-1 dense:gap-1"
          renderItem={(note) => (
            <PinnedNote item={note} group={group} actions={actions} size={size} />
          )}
        />
      )}
    </div>
  )
}
