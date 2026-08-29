import { Check, Info, X } from 'lucide-react'
import { toastClasses } from '@tabhangar/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useSyncExternalStore } from 'react'
import type { ToastMessage } from '@/messages'

interface Entry extends ToastMessage {
  id: number
}

let entries: Entry[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function dismiss(id: number) {
  entries = entries.filter((entry) => entry.id !== id)
  emit()
}

export function pushToast(message: ToastMessage) {
  const id = nextId++
  entries = [...entries, { ...message, id }].slice(-3)
  emit()
  setTimeout(() => dismiss(id), message.undoId ? 6500 : 3500)
}

const isDark = (theme: ToastMessage['theme']) =>
  theme === 'dark' ||
  (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Toasts rendered inside the visited page (shadow DOM), bottom center. */
export function InPageToasts() {
  const list = useSyncExternalStore(subscribe, () => entries)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 flex flex-col items-center gap-2 font-sans">
      <AnimatePresence initial={false}>
        {list.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            role="status"
            className={`${toastClasses.card}${isDark(entry.theme) ? ' dark' : ''}`}
          >
            <span className={`${toastClasses.icon} ${toastClasses.tone(entry.tone)}`}>
              {entry.tone === 'error' ? (
                <X size={13} strokeWidth={3} />
              ) : entry.tone === 'info' ? (
                <Info size={13} />
              ) : (
                <Check size={13} strokeWidth={3} />
              )}
            </span>
            <span className="max-w-[420px] truncate font-medium">{entry.title}</span>
            {entry.undoId && (
              <button
                type="button"
                onClick={() => {
                  void browser.runtime.sendMessage({ type: 'tabhangar:undo', undoId: entry.undoId })
                  dismiss(entry.id)
                }}
                className={toastClasses.action}
              >
                {entry.undoLabel ?? 'Undo'}
              </button>
            )}
            <button
              type="button"
              aria-label={entry.dismissLabel ?? 'Dismiss'}
              onClick={() => dismiss(entry.id)}
              className={toastClasses.dismiss}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
