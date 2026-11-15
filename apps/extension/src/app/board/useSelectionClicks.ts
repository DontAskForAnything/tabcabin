import { useEffect } from 'react'
import { useUi } from '@/state/ui'

/** Where a click keeps the picked items: the bar for them, menus, dialogs and toasts. */
const KEEPS = '[data-selection-bar], [role="menu"], [role="dialog"], [data-toaster]'

/** Whether the element is (inside) one of the picked items. */
function insidePicked(element: Element, selection: readonly string[]) {
  for (let node = element.closest<HTMLElement>('[data-dnd-item]'); node;) {
    if (selection.includes(node.dataset.dndItem!)) return true
    node = node.parentElement?.closest<HTMLElement>('[data-dnd-item]') ?? null
  }
  return false
}

/**
 * A click anywhere else puts the picked items back; pressing one of them keeps them (it may be
 * the start of dragging them all). Shift-clicking items does not select the page text between.
 */
export function useSelectionClicks() {
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (event.shiftKey) {
        if (target.closest('[data-dnd-item]')) event.preventDefault()
        return
      }
      const { selection, clearSelection } = useUi.getState()
      if (!selection.length || event.button !== 0) return
      if (target.closest(KEEPS) || insidePicked(target, selection)) return
      clearSelection()
    }
    document.addEventListener('mousedown', onMouseDown, true)
    return () => document.removeEventListener('mousedown', onMouseDown, true)
  }, [])
}
