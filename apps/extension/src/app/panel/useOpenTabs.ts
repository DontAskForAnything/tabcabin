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

/** Live list of tabs in all windows (refreshes on any tab/window event). */
export function useOpenTabs(): OpenTab[] {
  const [tabs, setTabs] = useState<OpenTab[]>([])
  useEffect(() => {
    if (!hasTabsApi()) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        const all = await browser.tabs.query({})
        setTabs(all.map(toOpenTab).filter((tab): tab is OpenTab => tab !== null))
      }, 120)
    }
    refresh()
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
      if (timer) clearTimeout(timer)
      for (const event of events) event.removeListener(refresh)
    }
  }, [])
  return tabs
}

/** Id of the window this page lives in. */
export function useCurrentWindowId(): number | null {
  const [id, setId] = useState<number | null>(null)
  useEffect(() => {
    if (!hasTabsApi()) return
    void browser.windows.getCurrent().then((win) => setId(win.id ?? null))
  }, [])
  return id
}
