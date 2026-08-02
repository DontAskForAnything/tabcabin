import { Popover as RadixPopover } from 'radix-ui'
import { type ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const Popover = RadixPopover.Root
export const PopoverTrigger = RadixPopover.Trigger
export const PopoverAnchor = RadixPopover.Anchor
export const PopoverClose = RadixPopover.Close

export function PopoverContent({
  className,
  sideOffset = 8,
  align = 'start',
  ...props
}: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-[90] rounded-[18px] bg-card p-4 text-ink shadow-pop outline-none',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  )
}
