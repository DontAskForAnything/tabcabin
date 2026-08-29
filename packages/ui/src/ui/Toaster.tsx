import { Check, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { dismissToast, type ToastTone, useToasts } from './toast'
import { useUiText } from './UiText'

const icons: Record<ToastTone, { node: ReactNode; className: string }> = {
  success: { node: <Check size={13} strokeWidth={3} />, className: 'bg-success text-card' },
  error: { node: <X size={13} strokeWidth={3} />, className: 'bg-danger text-card' },
  info: { node: <Info size={13} strokeWidth={2.6} />, className: 'bg-accent text-card' },
}

/** Shared toast look (also used by the in-page toasts of the extension). */
export const toastClasses = {
  card: 'pointer-events-auto flex max-w-[520px] items-center gap-3 rounded-[14px] bg-raised py-2.5 pr-2.5 pl-3.5 text-[13.5px] text-ink shadow-pop',
  icon: 'flex size-[22px] shrink-0 items-center justify-center rounded-[7px]',
  description: 'text-[12.5px] text-ink-3',
  action:
    'h-7 rounded-lg bg-accent-soft px-2.5 text-[12.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-95',
  dismiss:
    'flex size-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-subtle hover:text-ink',
  tone: (tone: ToastTone) => icons[tone].className,
}

/** Renders the toast stack (bottom center). Mount once near the app root. */
export function Toaster({ className }: { className?: string }) {
  const toasts = useToasts()
  const text = useUiText()
  return (
    <div
      data-toaster
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex flex-col items-center gap-2 px-4',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {toasts.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            role="status"
            className={toastClasses.card}
          >
            <span className={cn(toastClasses.icon, icons[entry.tone].className)}>
              {icons[entry.tone].node}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{entry.title}</div>
              {entry.description && (
                <div className={toastClasses.description}>{entry.description}</div>
              )}
            </div>
            {entry.action && (
              <button
                type="button"
                onClick={() => {
                  entry.action?.onClick()
                  dismissToast(entry.id)
                }}
                className={toastClasses.action}
              >
                {entry.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label={text.dismiss}
              onClick={() => dismissToast(entry.id)}
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
