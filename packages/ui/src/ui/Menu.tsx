import { Check, ChevronRight } from 'lucide-react'
import { ContextMenu as RadixContextMenu, DropdownMenu } from 'radix-ui'
import { type ComponentProps, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export const Menu = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuSub = DropdownMenu.Sub
export const MenuGroup = DropdownMenu.Group

const panel =
  'z-[90] min-w-[220px] overflow-hidden rounded-[14px] bg-card p-1.5 text-ink shadow-pop outline-none data-[side=bottom]:origin-top'

export function MenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(panel, className)}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

const itemClass =
  'flex h-9 cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium outline-none select-none data-[disabled]:cursor-default data-[disabled]:opacity-45 data-[highlighted]:bg-subtle'

export interface MenuItemProps extends ComponentProps<typeof DropdownMenu.Item> {
  icon?: ReactNode
  shortcut?: string
  danger?: boolean
}

export function MenuItem({ icon, shortcut, danger, className, children, ...props }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      className={cn(
        itemClass,
        danger && 'text-danger data-[highlighted]:bg-danger-soft',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={cn('flex w-4 justify-center', danger ? 'text-danger' : 'text-ink-3')}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-[11.5px] text-ink-3">{shortcut}</span>}
    </DropdownMenu.Item>
  )
}

export function MenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.CheckboxItem>) {
  return (
    <DropdownMenu.CheckboxItem className={cn(itemClass, className)} {...props}>
      <span className="flex w-4 justify-center text-accent-ink">
        <DropdownMenu.ItemIndicator>
          <Check size={15} strokeWidth={2.6} />
        </DropdownMenu.ItemIndicator>
      </span>
      <span className="flex-1 truncate">{children}</span>
    </DropdownMenu.CheckboxItem>
  )
}

export function MenuSubTrigger({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.SubTrigger> & { icon?: ReactNode }) {
  return (
    <DropdownMenu.SubTrigger
      className={cn(itemClass, 'data-[state=open]:bg-subtle', className)}
      {...props}
    >
      {icon && <span className="flex w-4 justify-center text-ink-3">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      <ChevronRight size={15} className="text-ink-3" />
    </DropdownMenu.SubTrigger>
  )
}

export function MenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenu.SubContent>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        sideOffset={6}
        alignOffset={-6}
        className={cn(panel, className)}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

export function MenuSeparator({ className }: { className?: string }) {
  return <DropdownMenu.Separator className={cn('mx-1.5 my-1.5 h-px bg-line', className)} />
}

export function MenuLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <DropdownMenu.Label
      className={cn(
        'px-2.5 pt-1.5 pb-1 text-[11.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase',
        className,
      )}
    >
      {children}
    </DropdownMenu.Label>
  )
}

// ---------- context menu (right click) ----------

export const ContextMenu = RadixContextMenu.Root
export const ContextMenuTrigger = RadixContextMenu.Trigger

export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof RadixContextMenu.Content>) {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.Content className={cn(panel, className)} {...props} />
    </RadixContextMenu.Portal>
  )
}

export function ContextMenuItem({
  icon,
  shortcut,
  danger,
  className,
  children,
  ...props
}: ComponentProps<typeof RadixContextMenu.Item> & {
  icon?: ReactNode
  shortcut?: string
  danger?: boolean
}) {
  return (
    <RadixContextMenu.Item
      className={cn(
        itemClass,
        danger && 'text-danger data-[highlighted]:bg-danger-soft',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={cn('flex w-4 justify-center', danger ? 'text-danger' : 'text-ink-3')}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-[11.5px] text-ink-3">{shortcut}</span>}
    </RadixContextMenu.Item>
  )
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return <RadixContextMenu.Separator className={cn('mx-1.5 my-1.5 h-px bg-line', className)} />
}

export const ContextMenuSub = RadixContextMenu.Sub

export function ContextMenuSubTrigger({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof RadixContextMenu.SubTrigger> & { icon?: ReactNode }) {
  return (
    <RadixContextMenu.SubTrigger
      className={cn(itemClass, 'data-[state=open]:bg-subtle', className)}
      {...props}
    >
      {icon && <span className="flex w-4 justify-center text-ink-3">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      <ChevronRight size={15} className="text-ink-3" />
    </RadixContextMenu.SubTrigger>
  )
}

export function ContextMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof RadixContextMenu.SubContent>) {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.SubContent
        sideOffset={6}
        alignOffset={-6}
        className={cn(panel, className)}
        {...props}
      />
    </RadixContextMenu.Portal>
  )
}
