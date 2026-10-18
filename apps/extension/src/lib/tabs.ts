import { isSavableUrl, normalizeUrl } from '@tabcabin/core'
import type { NewLink } from '@/db/repo'

export interface TabLike {
  id: number
  url: string
  title: string
  favIconUrl: string | null
}

export function tabsToLinks(tabs: readonly TabLike[]): NewLink[] {
  return tabs
    .filter((tab) => isSavableUrl(tab.url))
    .map((tab) => ({ url: tab.url, title: tab.title || tab.url, favIconUrl: tab.favIconUrl }))
}

/** Closes tabs, never the page we are running in. */
export async function closeTabs(tabIds: readonly number[]) {
  if (typeof browser === 'undefined' || !browser.tabs) return
  const current = await browser.tabs.getCurrent()
  const ids = tabIds.filter((id) => id !== current?.id)
  if (ids.length === 0) return
  await browser.tabs.remove(ids).catch(() => undefined)
}

/** Ids of tabs whose URL already appeared earlier (keeps the active/first one). */
export function duplicateTabIds(
  tabs: readonly (TabLike & { active?: boolean; pinned?: boolean })[],
): number[] {
  const seen = new Map<string, number>()
  const duplicates: number[] = []
  const ordered = [...tabs].sort(
    (a, b) => Number(!!b.active) - Number(!!a.active) || Number(!!b.pinned) - Number(!!a.pinned),
  )
  for (const tab of ordered) {
    const key = normalizeUrl(tab.url)
    if (!key) continue
    if (seen.has(key)) duplicates.push(tab.id)
    else seen.set(key, tab.id)
  }
  return duplicates
}
