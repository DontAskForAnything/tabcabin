import type { MouseEvent } from 'react'
import { useUi } from '@/state/ui'
import { listOrder } from '../../dnd/apply'

/** Shift-click picks items (see `pickItems` in the UI state). The click handler returns true when it took the click. */
export function useSelectable(item: { id: string; parentId: string | null }, groupId: string) {
  const selected = useUi((s) => s.selection.includes(item.id))
  const pick = useUi((s) => s.pickItem)
  const onClickCapture = (event: MouseEvent) => {
    if (!event.shiftKey) return false
    event.preventDefault()
    event.stopPropagation()
    pick(item.id, groupId, listOrder(groupId, item.parentId))
    return true
  }
  return { selected, onClickCapture }
}

export const selectedRing = 'shadow-[0_0_0_2px_var(--accent)] bg-accent-soft'
