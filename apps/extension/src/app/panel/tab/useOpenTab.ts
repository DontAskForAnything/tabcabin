import { useDraggable } from '@dnd-kit/core'
import type { MouseEvent } from 'react'
import { useDrag } from '../../dnd/store'
import { dndId } from '../../dnd/types'
import { usePanel } from '../panelStore'
import type { OpenTab } from '../useOpenTabs'
import { dragSourceFor } from './dragSource'

const picking = (event: MouseEvent) => event.shiftKey || event.metaKey || event.ctrlKey

/**
 * Selecting, dragging and switching to an open tab (shared by the row and the rail tile).
 * `order` is the tabs as the panel shows them, for Shift-click ranges.
 */
export function useOpenTab(tab: OpenTab, allTabs: OpenTab[], order: readonly number[]) {
  const selectedIds = usePanel((s) => s.selected)
  const toggle = usePanel((s) => s.toggle)
  const pickRange = usePanel((s) => s.pickRange)
  const source = dragSourceFor(tab, selectedIds, allTabs)
  const { setNodeRef, listeners } = useDraggable({
    id: dndId.tab(tab.id),
    data: {
      source,
      overlay: {
        kind: 'tab',
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        count: source.tabIds.length,
        pickHint: source.tabIds.length === 1,
      },
    },
  })
  const dragging = useDrag((s) => s.source?.kind === 'tabs' && s.source.tabIds.includes(tab.id))

  return {
    selected: selectedIds.includes(tab.id),
    source,
    dragging,
    setNodeRef,
    listeners,
    /**
     * Click switches to the tab. Shift-click picks the tabs from the last picked one to this one;
     * Ctrl- or Cmd-click picks this tab or puts it back.
     */
    activate(event: MouseEvent) {
      if (event.shiftKey) {
        pickRange(tab.id, order)
        return
      }
      if (picking(event)) {
        toggle(tab.id)
        return
      }
      void browser.tabs.update(tab.id, { active: true })
      void browser.windows.update(tab.windowId, { focused: true })
    },
    /** Picking tabs must not select the page text between them. */
    keepTextUnselected(event: MouseEvent) {
      if (picking(event)) event.preventDefault()
    },
  }
}
