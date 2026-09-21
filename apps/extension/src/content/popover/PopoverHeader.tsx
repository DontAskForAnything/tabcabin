import { GripVertical, X } from 'lucide-react'
import type { Translate } from '@/i18n'
import type { useDraggable } from './useDraggable'

/** The draggable top bar with the close button. */
export function PopoverHeader({
  handle,
  onClose,
  t,
}: {
  handle: ReturnType<typeof useDraggable>['handle']
  onClose: () => void
  t: Translate
}) {
  return (
    <div
      className="flex cursor-grab items-center justify-between px-3 pt-2.5 active:cursor-grabbing"
      {...handle}
    >
      <GripVertical size={17} className="text-ink-4" />
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="flex size-[30px] items-center justify-center rounded-[9px] text-ink-3 hover:bg-subtle"
      >
        <X size={15} />
      </button>
    </div>
  )
}
