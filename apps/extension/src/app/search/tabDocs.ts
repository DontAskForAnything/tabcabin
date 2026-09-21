import { isSavableUrl } from '@tabhangar/core'
import type { SearchDoc } from '@/db/search'
import type { Translate } from '@/i18n'
import type { OpenTab } from '../panel/useOpenTabs'

/** Open tabs as searchable documents, with the window they are in. */
export function tabDocs(tabs: readonly OpenTab[], t: Translate): SearchDoc[] {
  const windowIds = [...new Set(tabs.map((tab) => tab.windowId))].sort((a, b) => a - b)
  return tabs
    .filter((tab) => isSavableUrl(tab.url))
    .map((tab) => ({
      key: `tab:${tab.id}`,
      kind: 'tab' as const,
      title: tab.title,
      url: tab.url,
      text: '',
      createdAt: 0,
      path: t('search.tabInWindow', {
        window: t('panel.windowN', { n: windowIds.indexOf(tab.windowId) + 1 }),
      }),
      tabId: tab.id,
      windowId: tab.windowId,
      favIconUrl: tab.favIconUrl,
    }))
}
