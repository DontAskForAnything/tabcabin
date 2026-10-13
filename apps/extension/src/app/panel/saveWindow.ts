import { toast } from '@tabcabin/ui'
import * as repo from '@/db/repo'
import type { Locale, Translate } from '@/i18n'
import { closeTabs, type TabLike, tabsToLinks } from '@/lib/tabs'

/**
 * Saves every tab of a window into one new group and closes them: another window closes
 * completely, the one TabCabin runs in keeps only this page. Undo opens the tabs again.
 */
export async function saveAndCloseWindow(
  windowId: number,
  tabs: readonly TabLike[],
  categoryId: string,
  { t, locale }: { t: Translate; locale: Locale },
) {
  const links = tabsToLinks(tabs)
  if (links.length === 0) return
  const date = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const created = await repo.createGroup(categoryId, {
    title: t('panel.windowTitle', { date }),
    emoji: '🪟',
  })
  const added = await repo.addLinks(created.groupId, links)
  const current = await browser.tabs.getCurrent()
  if (current?.windowId === windowId) await closeTabs(tabs.map((tab) => tab.id))
  else await browser.windows.remove(windowId).catch(() => undefined)

  toast({
    title: t('panel.windowSaved', { count: links.length }),
    tone: 'success',
    action: {
      label: t('common.undo'),
      onClick: () =>
        void (async () => {
          await browser.windows.create({ url: links.map((link) => link.url), focused: true })
          await repo.revert({ undo: [...added.undo, ...created.undo] })
        })(),
    },
  })
}
