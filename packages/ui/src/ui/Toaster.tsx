import { Check, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { dismissToast, type ToastTone, useToasts } from './toast'

const icons: Record<ToastTone, { node: ReactNode; className: string }> = {
  success: { node: <Check size={13} strokeWidth={3} />, className: 'bg-[#34d399] text-[#08291d]' },
  error: { node: <X size={13} strokeWidth={3} />, className: 'bg-[#f87171] text-[#3b0b0b]' },
  info: { node: <Info size={13} strokeWidth={2.6} />, className: 'bg-[#b3a9ff] text-[#1c1452]' },
}

/** Renders the toast stack (bottom center). Mount once near the app root. */
export function Toaster({ className }: { className?: string }) {
  const toasts = useToasts()
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
            className="pointer-events-auto flex max-w-[520px] items-center gap-3 rounded-[14px] bg-[#1b1e24] py-2.5 pr-2.5 pl-3.5 text-[13.5px] text-[#f2f3f6] shadow-[0_16px_40px_-10px_rgb(0_0_0/0.45)] dark:bg-[#2a2f36]"
          >
            <span
              className={cn(
                'flex size-[22px] shrink-0 items-center justify-center rounded-[7px]',
                icons[entry.tone].className,
              )}
            >
              {icons[entry.tone].node}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{entry.title}</div>
              {entry.description && (
                <div className="text-[12.5px] text-white/65">{entry.description}</div>
              )}
            </div>
            {entry.action && (
              <button
                type="button"
                onClick={() => {
                  entry.action?.onClick()
                  dismissToast(entry.id)
                }}
                className="h-7 rounded-lg bg-white/10 px-2.5 text-[12.5px] font-semibold hover:bg-white/20"
              >
                {entry.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismissToast(entry.id)}
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
