import { INBOX_ID } from '@tabcabin/core'
import type { SearchDoc } from '@/db/search'
import { openAsTabGroup, openUrl } from '@/lib/browser'
import { getGroupItems } from '@/db/repo/reads'
import { useUi } from '@/state/ui'
import { revealItem, setActiveCategory, type ActiveContext } from '../useActive'

/**
 * Opens a result: switches to an open tab, opens a link, or shows a note on its board
 * (`reveal` shows links on the board too).
 */
export function useOpenResult(active: ActiveContext) {
  const close = useUi((s) => s.closeModal)

  const goTo = async (doc: SearchDoc) => {
    if (doc.itemId && doc.groupId === INBOX_ID) {
      // The Inbox is on every board.
      close()
      useUi.getState().flashItem(doc.itemId)
      return
    }
    if (!doc.itemId || !doc.workspaceId || !doc.categoryId || !active.settings) return
    close()
    await revealItem(active.settings, {
      workspaceId: doc.workspaceId,
      categoryId: doc.categoryId,
      itemId: doc.itemId,
    })
  }

  const showGroup = async (doc: SearchDoc) => {
    if (!doc.groupId || !doc.workspaceId || !doc.categoryId || !active.settings) return
    close()
    await setActiveCategory(active.settings, doc.workspaceId, doc.categoryId)
    setTimeout(() => {
      document
        .querySelector(`[data-dnd-group="${doc.groupId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 150)
  }

  return async (doc: SearchDoc, reveal = false) => {
    if (doc.kind === 'group') {
      if (reveal) return showGroup(doc)
      close()
      return openGroupById(doc.groupId!, doc.title)
    }
    if (reveal || doc.kind === 'note' || doc.kind === 'todo') return goTo(doc)
    if (doc.kind === 'tab' && doc.tabId !== undefined) {
      await browser.tabs.update(doc.tabId, { active: true })
      if (doc.windowId !== undefined) await browser.windows.update(doc.windowId, { focused: true })
      close()
      return
    }
    if (doc.url) {
      close()
      await openUrl(doc.url, {
        newTab: active.settings?.openLinksInNewTab ?? false,
        focusExisting: active.settings?.focusExistingTab ?? true,
      })
    }
  }
}

/** Opens every link of a group (stacks included) as a tab group. */
async function openGroupById(groupId: string, title: string) {
  const urls = (await getGroupItems(groupId))
    .filter((item) => item.kind === 'link' && item.url)
    .sort((a, b) => (a.position < b.position ? -1 : 1))
    .map((item) => item.url!)
  await openAsTabGroup(urls, { title })
}
