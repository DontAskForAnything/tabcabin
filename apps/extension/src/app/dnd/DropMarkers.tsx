import { Trash } from 'lucide-react'
import { cn } from '@tabhangar/ui'
import { motion } from 'motion/react'
import { useT } from '@/i18n'
import { useSimpleDrop } from './hooks'
import { dndId } from './types'

/** Horizontal insertion line between list items (takes no space). */
export function DropLine() {
  return (
    <div
      aria-hidden
      className="relative z-10 -my-[4.5px] h-[3px] rounded-full bg-success shadow-[0_0_0_3px_var(--success-soft)]"
    />
  )
}

/** Placeholder cell shown at the insertion point of a grid. */
export function DropCell() {
  return (
    <div
      aria-hidden
      className="min-h-[72px] rounded-[14px] border-2 border-dashed border-success bg-success-soft"
    />
  )
}

/** Vertical insertion line between board columns (takes no space in a gap-5 row). */
export function GroupDropLine({ axis }: { axis: 'x' | 'y' }) {
  return axis === 'x' ? (
    <div
      aria-hidden
      className="relative z-10 -mx-3 w-1 shrink-0 self-stretch rounded-full bg-success"
    />
  ) : (
    <div aria-hidden className="relative z-10 -my-3 h-1 shrink-0 rounded-full bg-success" />
  )
}

export function TrashZone({ enabled }: { enabled: boolean }) {
  const t = useT()
  const { setNodeRef, active, dragging, sourceKind } = useSimpleDrop(
    dndId.trash,
    { zone: 'trash' },
    !enabled,
  )
  const visible = enabled && dragging && sourceKind !== 'tabs'
  // Always mounted so the drop zone is measured when a drag starts.
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      <motion.div
        ref={setNodeRef}
        aria-hidden={!visible}
        initial={false}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 24 }}
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        className={cn(
          'flex h-14 min-w-[280px] items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-6 text-[14px] font-semibold shadow-pop transition-colors',
          visible && 'pointer-events-auto',
          active ? 'border-danger bg-danger text-white' : 'border-danger/60 bg-card text-danger',
        )}
      >
        <Trash size={18} />
        {t('dnd.dropToDelete')}
      </motion.div>
    </div>
  )
}
