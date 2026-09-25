import { useDraggable } from '@dnd-kit/core'
import type { MouseEvent } from 'react'
import { useDrag } from '../../dnd/store'
import { dndId } from '../../dnd/types'
import { usePanel } from '../panelStore'
import type { OpenTab } from '../useOpenTabs'
import { dragSourceFor } from './dragSource'

/** Selecting, dragging and switching to an open tab (shared by the row and the rail tile). */
export function useOpenTab(tab: OpenTab, allTabs: OpenTab[]) {
  const selectedIds = usePanel((s) => s.selected)
  const toggle = usePanel((s) => s.toggle)
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
    /** Click switches to the tab; with Shift, Ctrl or Cmd it toggles the selection. */
    activate(event: MouseEvent) {
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        toggle(tab.id)
        return
      }
      void browser.tabs.update(tab.id, { active: true })
      void browser.windows.update(tab.windowId, { focused: true })
    },
  }
}
