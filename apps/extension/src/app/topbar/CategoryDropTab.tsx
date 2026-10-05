import { cn } from '@tabcabin/ui'
import type { ComponentProps } from 'react'
import { useSimpleDrop } from '../dnd/hooks'
import { dndId } from '../dnd/types'

export function CategoryDropTab({
  categoryId,
  className,
  ref,
  ...props
}: ComponentProps<'button'> & { categoryId: string }) {
  const { setNodeRef, active } = useSimpleDrop(dndId.category(categoryId), {
    zone: 'category',
    categoryId,
  })
  return (
    <button
      ref={(node) => {
        setNodeRef(node)
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      type="button"
      className={cn(className, active && 'shadow-[0_0_0_2px_var(--success)]')}
      {...props}
    />
  )
}
