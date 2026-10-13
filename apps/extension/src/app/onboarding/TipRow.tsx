import { Kbd } from '@tabcabin/ui'
import type { ReactNode } from 'react'

/** An icon tile, a line or two of text and, optionally, the keys that do it. */
export function TipRow({
  icon,
  title,
  keys,
  children,
}: {
  icon: ReactNode
  title?: string
  keys?: string
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-3">
        {title && <span className="block text-[14px] font-semibold text-ink">{title}</span>}
        {children}
      </span>
      {keys && <Kbd className="h-6 shrink-0 px-2 text-[12px]">{keys}</Kbd>}
    </li>
  )
}
