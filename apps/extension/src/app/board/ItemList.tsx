import { cn } from '@tabhangar/ui'
import { Fragment, type ReactNode } from 'react'
import type { BoardItem } from '@/db/hooks'
import { DropCell, DropLine } from '../dnd/DropMarkers'
import { useListDrop } from '../dnd/hooks'
import { useBoardContext } from './BoardContext'
import { DraggableItem } from './DraggableItem'
import { ItemContextMenu } from './ItemContextMenu'

/** A drop-aware list (or grid) of items inside a group or a stack. */
export function ItemList({
  groupId,
  parentId = null,
  items,
  layout = 'list',
  renderItem,
  wrapItem,
  extra,
  className,
}: {
  groupId: string
  parentId?: string | null
  items: BoardItem[]
  layout?: 'list' | 'grid'
  renderItem: (item: BoardItem) => ReactNode
  /** Wraps each item (e.g. with a context menu). */
  wrapItem?: (item: BoardItem, node: ReactNode) => ReactNode
  extra?: ReactNode
  className?: string
}) {
  const { setNodeRef, insertAt, listId } = useListDrop(groupId, parentId, layout)
  const marker = layout === 'grid' ? <DropCell /> : <DropLine />
  const board = useBoardContext()
  const wrap =
    wrapItem ??
    ((item: BoardItem, node: ReactNode) =>
      board ? (
        <ItemContextMenu item={item} groups={board.groups} actions={board.actions}>
          {node}
        </ItemContextMenu>
      ) : (
        node
      ))
  return (
    <div
      ref={setNodeRef}
      data-list-id={listId}
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3'
          : 'flex min-h-[44px] flex-col gap-1.5',
        className,
      )}
    >
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {insertAt === index && marker}
          {wrap(
            item,
            <DraggableItem item={item} index={index} layout={layout}>
              {renderItem(item)}
            </DraggableItem>,
          )}
        </Fragment>
      ))}
      {insertAt !== null && insertAt >= items.length && marker}
      {extra}
    </div>
  )
}
