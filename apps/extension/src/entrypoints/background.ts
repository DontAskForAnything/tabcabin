import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import { startBadge } from '@/background/badge'
import { SAVE_TO_INBOX, saveTabToInbox } from '@/background/inbox'
import { checkLinks, startLinkChecks } from '@/background/linkChecks'
import { handleMenuClick, rebuildMenus } from '@/background/menus'
import { handlePopoverMessage, togglePopover } from '@/background/popover'
import { checkReminders, startReminders } from '@/background/reminders'
import { startSync, syncEngine } from '@/background/sync'
import { runUndo } from '@/background/toast'
import { trimBin } from '@/db/repo'
import { isRuntimeMessage } from '@/messages'

export default defineBackground(() => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const scheduleMenus = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void rebuildMenus().catch((error) => console.error(error)), 300)
  }

  browser.runtime.onInstalled.addListener(() => {
    void browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false })
    scheduleMenus()
  })
  browser.runtime.onStartup.addListener(() => {
    scheduleMenus()
    void trimBin()
  })

  // Rebuild the right-click menu whenever groups, categories, workspaces or the active workspace change.
  liveQuery(async () => {
    const [groups, categories, workspaces, active] = await Promise.all([
      db.groups.toArray(),
      db.categories.toArray(),
      db.workspaces.toArray(),
      db.settings.get('activeWorkspaceId'),
    ])
    return groups.length + categories.length + workspaces.length + JSON.stringify(active ?? null)
  }).subscribe({ next: scheduleMenus })

  browser.contextMenus.onClicked.addListener((info, tab) => void handleMenuClick(info, tab))
  browser.action.onClicked.addListener((tab) => void togglePopover(tab))
  browser.commands.onCommand.addListener((command, tab) => {
    if (command === SAVE_TO_INBOX) void saveTabToInbox(tab)
  })

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isRuntimeMessage(message)) return undefined
    if (message.type === 'tabcabin:sync-now') {
      void syncEngine.syncNow()
      syncEngine.startLive()
      return undefined
    }
    if (message.type === 'tabcabin:check-links') {
      void checkLinks()
      return undefined
    }
    if (message.type === 'tabcabin:undo') {
      void runUndo(message.undoId)
      return undefined
    }
    const reply = handlePopoverMessage(message, sender)
    if (reply) {
      void reply.then(sendResponse)
      return true
    }
    return undefined
  })

  startBadge()
  startReminders()
  startSync()
  startLinkChecks()

  // Hooks for end-to-end tests (menus and the toolbar button can't be clicked from Playwright).
  Object.assign(globalThis, {
    tabcabin: {
      handleMenuClick,
      togglePopover,
      saveTabToInbox,
      rebuildMenus,
      checkReminders,
      checkLinks,
      db,
    },
  })
})
