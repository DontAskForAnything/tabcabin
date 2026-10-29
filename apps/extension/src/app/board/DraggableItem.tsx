import { cn } from '@tabcabin/ui'
import { type ComponentProps, type ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import type { BoardItem } from '@/db/hooks'
import { useUi } from '@/state/ui'
import { glideIn } from '../dnd/glide'
import { useItemDnd } from '../dnd/hooks'
import type { ParentKind } from '../dnd/types'

/** Wraps an item so it can be dragged and receive drops (insert or combine). */
export function DraggableItem({
  item,
  index,
  layout = 'list',
  parentKind = null,
  children,
  ref,
  className,
  ...rest
}: Omit<ComponentProps<'div'>, 'children'> & {
  item: BoardItem
  index: number
  layout?: 'list' | 'grid'
  parentKind?: ParentKind
  children: ReactNode
}) {
  const editing = useUi((s) => s.editingNoteId === item.id)
  const flash = useUi((s) => s.flashItemId === item.id)
  const node = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!flash) return
    node.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    const timer = setTimeout(() => useUi.getState().flashItem(null), 1800)
    return () => clearTimeout(timer)
  }, [flash])
  // Dropped into this list a moment ago: glide in from where it was let go.
  useLayoutEffect(() => {
    if (node.current) glideIn(item.id, node.current)
  }, [item.id])
  const { setNodeRef, handleProps, dragging, combineTarget, pending } = useItemDnd(
    item,
    index,
    layout,
    parentKind,
    editing,
  )
  return (
    <div
      {...rest}
      ref={(element) => {
        node.current = element
        setNodeRef(element)
        if (typeof ref === 'function') ref(element)
        else if (ref) ref.current = element
      }}
      data-dnd-item={item.id}
      data-dnd-kind={item.kind}
      {...handleProps}
      className={cn(
        'relative rounded-[13px] outline-none transition-[opacity,box-shadow,background,transform] duration-150',
        dragging && 'opacity-35',
        pending && 'shadow-[0_0_0_2px_var(--success-soft)]',
        combineTarget && 'scale-[1.02] bg-success-soft shadow-[0_0_0_2px_var(--success)]',
        flash && 'animate-[flash_1.8s_ease-out]',
        className,
      )}
    >
      {children}
    </div>
  )
}
