import { Tooltip as RadixTooltip } from 'radix-ui'
import { type ReactElement, type ReactNode } from 'react'

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={450} skipDelayDuration={200}>
      {children}
    </RadixTooltip.Provider>
  )
}

export interface TooltipProps {
  label: ReactNode
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  shortcut?: string
}

export function Tooltip({ label, children, side = 'bottom', shortcut }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-[100] flex items-center gap-2 rounded-lg bg-[#1b1e24] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-pop dark:bg-[#2a2f36]"
        >
          {label}
          {shortcut && (
            <kbd className="rounded bg-white/15 px-1.5 py-px font-sans text-[11px] text-white/80">
              {shortcut}
            </kbd>
          )}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
