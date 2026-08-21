import { isSavableUrl, normalizeUrl, sortByPosition } from '@tabhangar/core'
import { db } from '@/db/db'
import { loadOverview } from '@/db/overview'
import { getSettings } from '@/settings/settings'
import type { RuntimeMessage } from '@/messages'
import { saveToGroup } from './saving'

export interface PopoverData {
  locale: 'en' | 'pl'
  theme: 'light' | 'dark' | 'system'
  activeWorkspaceId: string | null
  activeCategoryId: string | null
  closeTabOnSave: boolean
  workspaces: {
    id: string
    name: string
    emoji: string
    categories: {
      id: string
      name: string
      groups: { id: string; title: string; emoji: string }[]
    }[]
  }[]
  savedIn: { itemId: string; path: string; text: string; color: string | null }[]
}

async function popoverData(url: string): Promise<PopoverData> {
  const [settings, overview, groups, items] = await Promise.all([
    getSettings(),
    loadOverview(),
    db.groups.toArray(),
    db.items.toArray(),
  ])
  const liveGroups = sortByPosition(groups.filter((g) => g.deletedAt === null))
  const key = normalizeUrl(url)
  const savedIn: PopoverData['savedIn'] = []
  if (key) {
    for (const item of items) {
      if (item.deletedAt !== null || !item.url || normalizeUrl(item.url) !== key) continue
      const group = liveGroups.find((g) => g.id === item.groupId)
      if (!group) continue
      const ws = overview.find((w) => w.categories.some((c) => c.id === group.categoryId))
      const cat = ws?.categories.find((c) => c.id === group.categoryId)
      if (!ws || !cat) continue
      savedIn.push({
        itemId: item.id,
        path: `${ws.name} › ${cat.name} › ${group.emoji} ${group.title}`,
        text: item.text,
        color: item.color,
      })
    }
  }
  const activeWorkspaceId = settings.activeWorkspaceId ?? overview[0]?.id ?? null
  return {
    locale: settings.locale,
    theme: settings.theme,
    activeWorkspaceId,
    activeCategoryId: activeWorkspaceId
      ? (settings.activeCategoryIds[activeWorkspaceId] ?? null)
      : null,
    closeTabOnSave: settings.closeTabOnSave,
    workspaces: overview.map((ws) => ({
      id: ws.id,
      name: ws.name,
      emoji: ws.emoji,
      categories: ws.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        groups: liveGroups
          .filter((g) => g.categoryId === cat.id)
          .map((g) => ({ id: g.id, title: g.title, emoji: g.emoji })),
      })),
    })),
    savedIn,
  }
}

/** Opens or closes the in-page popover. Pages that can't be scripted open the app instead. */
export async function togglePopover(tab: Browser.tabs.Tab) {
  if (tab.id === undefined) return
  if (
    !isSavableUrl(tab.url) ||
    /^https:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/.test(tab.url ?? '')
  ) {
    await browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') })
    return
  }
  try {
    const pong = await browser.tabs.sendMessage(tab.id, {
      type: 'tabhangar:ping',
      target: 'popover',
    })
    if (pong === 'pong') {
      await browser.tabs.sendMessage(tab.id, { type: 'tabhangar:popover-toggle' })
      return
    }
  } catch {
    // not injected yet
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['/content-scripts/popover.js'],
    })
  } catch {
    await browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') })
  }
}

export function handlePopoverMessage(
  message: RuntimeMessage,
  sender: Browser.runtime.MessageSender,
): Promise<unknown> | null {
  if (message.type === 'tabhangar:popover-data') return popoverData(message.url)
  if (message.type === 'tabhangar:open-app')
    return browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') }).then(() => true)
  if (message.type === 'tabhangar:popover-save') {
    return (async () => {
      const saved = await saveToGroup(message.target, {
        kind: 'link',
        url: message.page.url,
        title: message.page.title,
        favIconUrl: message.page.favIconUrl,
        note: message.note,
      })
      const tabId = sender.tab?.id
      if (message.closeTab && tabId !== undefined) {
        const siblings = await browser.tabs.query({ windowId: sender.tab?.windowId })
        if (siblings.length <= 1) await browser.tabs.update(tabId, { url: 'chrome://newtab/' })
        else await browser.tabs.remove(tabId)
      }
      return { ok: true, groupTitle: saved.groupTitle }
    })().catch((error: unknown) => ({ ok: false, error: String(error) }))
  }
  return null
}
