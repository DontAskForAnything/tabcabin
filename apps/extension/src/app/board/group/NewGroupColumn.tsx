import { cn } from '@tabhangar/ui'
import { Plus } from 'lucide-react'
import { useSimpleDrop } from '../../dnd/hooks'
import { dndId } from '../../dnd/types'

export function NewGroupColumn({
  onCreate,
  label,
  hint,
}: {
  onCreate: () => void
  label: string
  hint: string
}) {
  const { setNodeRef, active } = useSimpleDrop(dndId.newGroup, { zone: 'newGroup' })
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onCreate}
      className={cn(
        'flex min-h-[220px] w-[280px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-card border-2 border-dashed border-line p-6 text-center text-ink-3 transition-colors hover:border-accent/40 hover:text-ink-2',
        active && 'border-success bg-success-soft text-ink',
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-[14px] bg-subtle-2">
        <Plus size={20} />
      </span>
      <span className="text-[14px] font-semibold text-ink-2">{label}</span>
      <span className="text-[12.5px] leading-snug">
        {hint} <kbd className="rounded-[5px] bg-subtle-2 px-1.5 font-sans">G</kbd>
      </span>
    </button>
  )
}
