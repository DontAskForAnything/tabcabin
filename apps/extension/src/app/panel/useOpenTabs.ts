import { useEffect, useState } from 'react'

export interface OpenTab {
  id: number
  windowId: number
  title: string
  url: string
  favIconUrl: string | null
  pinned: boolean
  active: boolean
  groupId: number
  discarded: boolean
  index: number
}

const hasTabsApi = () => typeof browser !== 'undefined' && !!browser.tabs?.query

function toOpenTab(tab: Browser.tabs.Tab): OpenTab | null {
  if (tab.id === undefined || tab.windowId === undefined) return null
  return {
    id: tab.id,
    windowId: tab.windowId,
    title: tab.title ?? tab.url ?? '',
    url: tab.url ?? tab.pendingUrl ?? '',
    favIconUrl: tab.favIconUrl ?? null,
    pinned: tab.pinned,
    active: tab.active,
    groupId: tab.groupId ?? -1,
    discarded: tab.discarded,
    index: tab.index,
  }
}

// The last answers, kept for the page's lifetime: a panel that mounts again (pinned, peeking
// from the rail) starts with them instead of an empty list.
let lastTabs: OpenTab[] | null = null
let lastWindowId: number | null = null
let lastGroups: ChromeTabGroup[] = []

/**
 * Live list of tabs in all windows (refreshes on any tab/window event); `null` until the browser
 * has answered once.
 */
export function useOpenTabs(): OpenTab[] | null {
  const [tabs, setTabs] = useState(lastTabs)
  useEffect(() => {
    if (!hasTabsApi()) return
    let timer: ReturnType<typeof setTimeout> | null = null
    let latest = 0
    const load = async () => {
      const call = ++latest
      const all = await browser.tabs.query({})
      if (call !== latest) return
      lastTabs = all.map(toOpenTab).filter((tab): tab is OpenTab => tab !== null)
      setTabs(lastTabs)
    }
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void load(), 120)
    }
    void load()
    const events = [
      browser.tabs.onCreated,
      browser.tabs.onRemoved,
      browser.tabs.onUpdated,
      browser.tabs.onMoved,
      browser.tabs.onActivated,
      browser.tabs.onAttached,
      browser.tabs.onDetached,
      browser.tabs.onReplaced,
      browser.windows.onFocusChanged,
    ]
    for (const event of events) event.addListener(refresh)
    return () => {
      latest++
      if (timer) clearTimeout(timer)
      for (const event of events) event.removeListener(refresh)
    }
  }, [])
  return tabs
}

/** Id of the window this page lives in. */
export function useCurrentWindowId(): number | null {
  const [id, setId] = useState(lastWindowId)
  useEffect(() => {
    if (!hasTabsApi()) return
    void browser.windows.getCurrent().then((win) => {
      lastWindowId = win.id ?? null
      setId(lastWindowId)
    })
  }, [])
  return id
}

export interface ChromeTabGroup {
  id: number
  windowId: number
  title: string
  color: string
  collapsed: boolean
}

/** Live list of native browser tab groups. */
export function useTabGroups(): ChromeTabGroup[] {
  const [groups, setGroups] = useState(lastGroups)
  useEffect(() => {
    if (typeof browser === 'undefined' || !browser.tabGroups) return
    const refresh = async () => {
      const all = await browser.tabGroups.query({})
      lastGroups = all.map((g) => ({
        id: g.id,
        windowId: g.windowId,
        title: g.title ?? '',
        color: g.color,
        collapsed: g.collapsed,
      }))
      setGroups(lastGroups)
    }
    void refresh()
    const events = [
      browser.tabGroups.onCreated,
      browser.tabGroups.onUpdated,
      browser.tabGroups.onRemoved,
      browser.tabGroups.onMoved,
    ]
    for (const event of events) event.addListener(refresh)
    return () => {
      for (const event of events) event.removeListener(refresh)
    }
  }, [])
  return groups
}

/** Chrome tab-group colors (light / dark variants as rgb triplets). */
export const TAB_GROUP_COLORS: Record<string, [string, string]> = {
  grey: ['122 126 133', '218 220 224'],
  blue: ['27 115 232', '138 180 247'],
  red: ['217 48 37', '242 139 130'],
  yellow: ['250 171 0', '254 213 99'],
  green: ['23 128 56', '129 201 149'],
  pink: ['208 23 131', '255 139 203'],
  purple: ['161 66 244', '197 137 249'],
  cyan: ['2 123 131', '120 217 236'],
  orange: ['250 144 62', '252 173 112'],
}
