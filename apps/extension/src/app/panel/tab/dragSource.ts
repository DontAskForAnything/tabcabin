import type { DragSource } from '../../dnd/types'
import type { OpenTab } from '../useOpenTabs'

/** Tabs dragged together: the selection when this tab is part of it, else just this tab. */
export function dragSourceFor(
  tab: OpenTab,
  selected: number[],
  all: OpenTab[],
): Extract<DragSource, { kind: 'tabs' }> {
  const tabs = selected.includes(tab.id) ? all.filter((t) => selected.includes(t.id)) : [tab]
  return {
    kind: 'tabs',
    tabIds: tabs.map((t) => t.id),
    tabs: tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, favIconUrl: t.favIconUrl })),
  }
}
