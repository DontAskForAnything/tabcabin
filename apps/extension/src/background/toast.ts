import { translate } from '@/i18n/translate'
import { getSettings } from '@/settings/settings'
import type { ToastMessage, ToastTone } from '@/messages'

const pendingUndo = new Map<string, () => Promise<void>>()

export async function runUndo(undoId: string) {
  const undo = pendingUndo.get(undoId)
  pendingUndo.delete(undoId)
  if (undo) await undo()
}

async function ensureToastScript(tabId: number): Promise<boolean> {
  try {
    const pong = await browser.tabs.sendMessage(tabId, { type: 'tabhangar:ping', target: 'toast' })
    if (pong === 'pong') return true
  } catch {
    // not injected yet
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/toast.js'],
    })
    return true
  } catch {
    return false
  }
}

/** Shows a small toast inside the page (falls back to the badge when the page can't be scripted). */
export async function showToast(
  tabId: number,
  toast: {
    title: string
    description?: string
    tone: ToastTone
    undo?: () => Promise<void>
    undoLabel?: string
  },
) {
  const undoId = toast.undo ? crypto.randomUUID() : undefined
  if (undoId && toast.undo) {
    pendingUndo.set(undoId, toast.undo)
    setTimeout(() => pendingUndo.delete(undoId), 60_000)
  }
  const { locale, theme } = await getSettings()
  const message: ToastMessage = {
    type: 'tabhangar:toast',
    title: toast.title,
    description: toast.description,
    tone: toast.tone,
    undoId,
    undoLabel: toast.undoLabel ?? translate(locale, 'common.undo'),
    dismissLabel: translate(locale, 'common.dismiss'),
    theme,
  }
  if (await ensureToastScript(tabId)) {
    await browser.tabs.sendMessage(tabId, message).catch(() => undefined)
    return
  }
  await browser.action.setBadgeText({ tabId, text: toast.tone === 'error' ? '!' : '✓' })
  setTimeout(() => void browser.action.setBadgeText({ tabId, text: '' }), 2500)
}
