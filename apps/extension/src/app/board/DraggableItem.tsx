import { cn } from '@tabhangar/ui'
import type { ComponentProps, ReactNode } from 'react'
import type { BoardItem } from '@/db/hooks'
import { useUi } from '@/state/ui'
import { useItemDnd } from '../dnd/hooks'

/** Wraps an item so it can be dragged and receive drops (insert or combine). */
export function DraggableItem({
  item,
  index,
  layout = 'list',
  children,
  ref,
  className,
  ...rest
}: Omit<ComponentProps<'div'>, 'children'> & {
  item: BoardItem
  index: number
  layout?: 'list' | 'grid'
  children: ReactNode
}) {
  const editing = useUi((s) => s.editingNoteId === item.id)
  const { setNodeRef, handleProps, dragging, combineTarget, pending } = useItemDnd(
    item,
    index,
    layout,
    editing,
  )
  return (
    <div
      {...rest}
      ref={(node) => {
        setNodeRef(node)
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      data-dnd-item={item.id}
      {...handleProps}
      className={cn(
        'relative rounded-[13px] outline-none transition-[opacity,box-shadow,background,transform] duration-150',
        dragging && 'opacity-35',
        pending && 'shadow-[0_0_0_2px_var(--success-soft)]',
        combineTarget && 'scale-[1.02] bg-success-soft shadow-[0_0_0_2px_var(--success)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
