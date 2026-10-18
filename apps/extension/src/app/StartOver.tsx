import { toast } from '@tabcabin/ui'
import { useEffect } from 'react'
import { useT } from '@/i18n'
import { isRuntimeMessage } from '@/messages'

/** Session flag of the page that removed this browser's data while signing out. */
export const SIGNED_OUT_NOTE = 'tabcabin:signed-out'

/**
 * Reloads the page when this browser's data was removed (signing out on a borrowed computer),
 * so it starts over like a fresh install; the page that did it says it worked.
 */
export function StartOver() {
  const t = useT()
  useEffect(() => {
    if (sessionStorage.getItem(SIGNED_OUT_NOTE)) {
      sessionStorage.removeItem(SIGNED_OUT_NOTE)
      toast({ title: t('signOut.removed'), tone: 'success' })
    }
    if (typeof browser === 'undefined' || !browser.runtime?.onMessage) return
    const listener = (message: unknown) => {
      if (isRuntimeMessage(message) && message.type === 'tabcabin:reset') location.reload()
    }
    browser.runtime.onMessage.addListener(listener)
    return () => browser.runtime.onMessage.removeListener(listener)
  }, [t])
  return null
}
