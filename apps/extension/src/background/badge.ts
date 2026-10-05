import { normalizeUrl } from '@tabcabin/core'
import { liveQuery } from 'dexie'
import { db } from '@/db/db'

let counts = new Map<string, number>()
let dueReminders = 0
let dueTitle = ''

const ACCENT = '#1F4A3A'
const DUE = '#B3261E'

/** Number of saved links for a URL (normalized). */
function savedCount(url: string | undefined): number {
  const key = url ? normalizeUrl(url) : null
  return key ? (counts.get(key) ?? 0) : 0
}

/** Due reminders win over the saved count so they are noticed without notifications. */
async function updateBadge(tabId: number, url: string | undefined) {
  const due = dueReminders > 0
  const count = due ? dueReminders : savedCount(url)
  await Promise.all([
    browser.action.setBadgeBackgroundColor({ tabId, color: due ? DUE : ACCENT }),
    browser.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' }),
    browser.action.setTitle({ tabId, title: due ? dueTitle : 'TabHangar' }),
  ]).catch(() => undefined)
}

export function setDueReminders(count: number, title: string) {
  if (count === dueReminders && title === dueTitle) return
  dueReminders = count
  dueTitle = title
  void updateActiveTabs()
}

async function updateActiveTabs() {
  const tabs = await browser.tabs.query({ active: true })
  await Promise.all(
    tabs.map((tab) => (tab.id !== undefined ? updateBadge(tab.id, tab.url) : undefined)),
  )
}

/** Keeps the toolbar badge showing how many times the current page is saved. */
export function startBadge() {
  void browser.action.setBadgeBackgroundColor({ color: ACCENT })
  void browser.action.setBadgeTextColor?.({ color: '#FAF6EE' })
  liveQuery(() => db.items.toArray()).subscribe({
    next: (items) => {
      const next = new Map<string, number>()
      for (const item of items) {
        if (item.deletedAt !== null || !item.url) continue
        const key = normalizeUrl(item.url)
        if (key) next.set(key, (next.get(key) ?? 0) + 1)
      }
      counts = next
      void updateActiveTabs()
    },
  })
  browser.tabs.onActivated.addListener(({ tabId }) => {
    void browser.tabs.get(tabId).then((tab) => updateBadge(tabId, tab.url))
  })
  browser.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.url || change.status === 'complete') void updateBadge(tabId, tab.url)
  })
}
