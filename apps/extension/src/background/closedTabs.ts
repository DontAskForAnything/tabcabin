import { isSavableUrl } from '@tabcabin/core'
import { countActivity } from '@/db/activity/count'

/** Ids of tabs that show a page, in session storage so the worker still knows them after a nap. */
const PAGE_TABS = 'pageTabs'

/** A page worth counting: not an empty new tab, a browser page or a private window. */
const isPage = (tab: { url?: string; pendingUrl?: string; incognito?: boolean }) =>
  !tab.incognito && isSavableUrl(tab.url || tab.pendingUrl)

let queue: Promise<unknown> = Promise.resolve()

/** Changes the stored ids one step at a time (events arrive in bursts). */
function updatePageTabs<T>(change: (ids: Set<number>) => T): Promise<T> {
  const next = queue.then(async () => {
    const stored = (await browser.storage.session.get(PAGE_TABS))[PAGE_TABS] as number[] | undefined
    const ids = new Set(stored ?? [])
    const result = change(ids)
    await browser.storage.session.set({ [PAGE_TABS]: [...ids] })
    return result
  })
  queue = next.catch((error: unknown) => console.error(error))
  return next
}

let closed = 0
let flush: ReturnType<typeof setTimeout> | null = null

/** Closing a window closes many tabs at once: count them together. */
function countClosed() {
  closed++
  if (flush) clearTimeout(flush)
  flush = setTimeout(() => {
    const count = closed
    closed = 0
    void countActivity({ closed: count })
  }, 300)
}

/**
 * Counts every tab with a page that gets closed, however it was closed: in TabCabin (saving,
 * duplicates, the panel's X) or in Chrome itself (the tab's X, Ctrl+W, a whole window).
 */
export function startClosedTabs() {
  void browser.tabs.query({}).then((tabs) =>
    updatePageTabs((ids) => {
      for (const tab of tabs) if (tab.id !== undefined && isPage(tab)) ids.add(tab.id)
    }),
  )
  browser.tabs.onCreated.addListener((tab) => {
    if (tab.id !== undefined && isPage(tab)) void updatePageTabs((ids) => ids.add(tab.id!))
  })
  browser.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.url === undefined) return
    void updatePageTabs((ids) => (isPage(tab) ? ids.add(tabId) : ids.delete(tabId)))
  })
  browser.tabs.onReplaced.addListener((added, removed) => {
    void updatePageTabs((ids) => {
      if (ids.delete(removed)) ids.add(added)
    })
  })
  browser.tabs.onRemoved.addListener((tabId) => {
    void updatePageTabs((ids) => ids.delete(tabId)).then((wasPage) => {
      if (wasPage) countClosed()
    })
  })
}
