import type { MouseEvent } from 'react'
import { useUi } from '@/state/ui'

/** Shift+click toggles selection. Returns true when the click was consumed. */
export function useSelectable(id: string, groupId: string) {
  const selected = useUi((s) => s.selection.includes(id))
  const toggle = useUi((s) => s.toggleSelected)
  const onClickCapture = (event: MouseEvent) => {
    if (!event.shiftKey) return false
    event.preventDefault()
    event.stopPropagation()
    toggle(id, groupId)
    return true
  }
  return { selected, onClickCapture }
}

export const selectedRing = 'shadow-[0_0_0_2px_var(--accent)] bg-accent-soft'
