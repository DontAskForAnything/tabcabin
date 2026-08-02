import { type ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-subtle px-1.5 font-sans text-[11px] font-medium text-ink-3',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
