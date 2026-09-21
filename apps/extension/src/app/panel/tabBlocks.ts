import type { ChromeTabGroup, OpenTab } from './useOpenTabs'

export type TabBlock =
  { type: 'tab'; tab: OpenTab } | { type: 'group'; group: ChromeTabGroup; tabs: OpenTab[] }

/** Tabs in window order, with the members of each Chrome tab group kept together. */
export function tabBlocks(tabs: readonly OpenTab[], groups: readonly ChromeTabGroup[]): TabBlock[] {
  const result: TabBlock[] = []
  const seen = new Set<number>()
  for (const tab of tabs) {
    if (tab.groupId === -1) result.push({ type: 'tab', tab })
    else if (!seen.has(tab.groupId)) {
      seen.add(tab.groupId)
      const group = groups.find((g) => g.id === tab.groupId)
      const members = tabs.filter((other) => other.groupId === tab.groupId)
      if (group) result.push({ type: 'group', group, tabs: members })
      else members.forEach((member) => result.push({ type: 'tab', tab: member }))
    }
  }
  return result
}

/** Tabs whose title or address contains the query. */
export function filterTabs(tabs: readonly OpenTab[], query: string): readonly OpenTab[] {
  const q = query.trim().toLowerCase()
  if (!q) return tabs
  return tabs.filter(
    (tab) => tab.title.toLowerCase().includes(q) || tab.url.toLowerCase().includes(q),
  )
}
