import { Check, Info, X } from 'lucide-react'
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
            className="pointer-events-auto flex items-center gap-3 rounded-[14px] bg-[#1b1e24] py-2.5 pr-2.5 pl-3.5 text-[13.5px] text-[#f2f3f6] shadow-[0_16px_40px_-10px_rgb(0_0_0/0.45)]"
          >
            <span
              className={
                entry.tone === 'error'
                  ? 'flex size-[22px] items-center justify-center rounded-[7px] bg-[#f87171] text-[#3b0b0b]'
                  : entry.tone === 'info'
                    ? 'flex size-[22px] items-center justify-center rounded-[7px] bg-[#b3a9ff] text-[#1c1452]'
                    : 'flex size-[22px] items-center justify-center rounded-[7px] bg-[#34d399] text-[#08291d]'
              }
            >
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
                className="h-7 rounded-lg bg-white/10 px-2.5 text-[12.5px] font-semibold hover:bg-white/20"
              >
                {entry.undoLabel ?? 'Undo'}
              </button>
            )}
            <button
              type="button"
              aria-label={entry.dismissLabel ?? 'Dismiss'}
              onClick={() => dismiss(entry.id)}
              className="flex size-7 items-center justify-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
