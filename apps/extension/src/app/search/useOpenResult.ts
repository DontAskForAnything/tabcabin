import type { SearchDoc } from '@/db/search'
import { openUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { revealItem, type ActiveContext } from '../useActive'

/**
 * Opens a result: switches to an open tab, opens a link, or shows a note on its board
 * (`reveal` shows links on the board too).
 */
export function useOpenResult(active: ActiveContext) {
  const close = useUi((s) => s.closeModal)

  const goTo = async (doc: SearchDoc) => {
    if (!doc.itemId || !doc.workspaceId || !doc.categoryId || !active.settings) return
    close()
    await revealItem(active.settings, {
      workspaceId: doc.workspaceId,
      categoryId: doc.categoryId,
      itemId: doc.itemId,
    })
  }

  return async (doc: SearchDoc, reveal = false) => {
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
