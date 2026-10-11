import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { type ReactNode, type RefObject } from 'react'
import { cn } from '../lib/cn'
import { useUiText } from './UiText'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Visually hide the title (still read by screen readers). */
  hideTitle?: boolean
  /** Align to the top (command palette) instead of the center. */
  placement?: 'center' | 'top'
  className?: string
  /** Called before Escape closes the dialog; `event.preventDefault()` keeps it open. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  /** What gets the focus when the dialog opens (by default its first focusable element). */
  initialFocus?: RefObject<HTMLElement | null>
}

const widths = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideTitle = false,
  placement = 'center',
  className,
  onEscapeKeyDown,
  initialFocus,
}: ModalProps) {
  const text = useUiText()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <div
              className={cn(
                'pointer-events-none fixed inset-0 z-50 flex justify-center p-4',
                placement === 'top' ? 'items-start pt-[10vh]' : 'items-center',
              )}
            >
              <Dialog.Content
                asChild
                forceMount
                onEscapeKeyDown={onEscapeKeyDown}
                onOpenAutoFocus={(event) => {
                  if (!initialFocus?.current) return
                  event.preventDefault()
                  initialFocus.current.focus()
                }}
                onInteractOutside={(event) => {
                  // Keep the dialog open when the user clicks a toast (e.g. "Undo").
                  const target = event.target as HTMLElement | null
                  if (target?.closest('[data-toaster]')) event.preventDefault()
                }}
              >
                <motion.div
                  className={cn(
                    'pointer-events-auto flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[22px] bg-card text-ink shadow-pop outline-none',
                    widths[size],
                    className,
                  )}
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                >
                  <div className={cn('flex items-start gap-4 px-6 pt-5', hideTitle && 'sr-only')}>
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="text-[22px] font-semibold tracking-[-0.02em]">
                        {title}
                      </Dialog.Title>
                      {description && (
                        <Dialog.Description className="mt-1 text-[13.5px] text-ink-3">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close
                      aria-label={text.close}
                      className="-mr-2 flex size-9 items-center justify-center rounded-[10px] text-ink-3 hover:bg-subtle hover:text-ink"
                    >
                      <X size={18} />
                    </Dialog.Close>
                  </div>
                  {!description && (
                    <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  )}
                  <div
                    className={cn('min-h-0 flex-1 overflow-y-auto', !hideTitle && 'px-6 pt-4 pb-6')}
                  >
                    {children}
                  </div>
                  {footer && (
                    <div className="flex items-center justify-end gap-2 border-t border-line bg-subtle/60 px-6 py-3.5">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
