import { displayHost, INBOX_ID, isSavableUrl } from '@tabcabin/core'
import type { MessageKey } from '@/i18n/en'
import { translate } from '@/i18n/translate'
import { getSettings } from '@/settings/settings'
import { saveToGroup } from './saving'
import { showToast } from './toast'

export const SAVE_TO_INBOX = 'save-to-inbox'

/** Saves the page of a tab to the Inbox in one go (keyboard shortcut) and says so in the page. */
export async function saveTabToInbox(tab: Browser.tabs.Tab | undefined) {
  if (tab?.id === undefined || !tab.url || !isSavableUrl(tab.url)) return
  const settings = await getSettings()
  const t = (key: MessageKey, params?: Record<string, string>) =>
    translate(settings.locale, key, params)
  try {
    const saved = await saveToGroup(
      { groupId: INBOX_ID },
      {
        kind: 'link',
        url: tab.url,
        title: tab.title || displayHost(tab.url),
        favIconUrl: tab.favIconUrl ?? null,
      },
    )
    await showToast(tab.id, {
      title: t('toast.saved', { group: saved.groupTitle }),
      description: saved.alsoIn ? t('duplicate.alsoIn', { place: saved.alsoIn }) : undefined,
      tone: 'success',
      undo: saved.undo,
      undoLabel: t('common.undo'),
    })
  } catch (error) {
    console.error(error)
    await showToast(tab.id, { title: t('toast.failed'), tone: 'error' })
  }
}
