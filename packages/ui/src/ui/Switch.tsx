import { Switch as RadixSwitch } from 'radix-ui'
import { cn } from '../lib/cn'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Switch({ checked, onCheckedChange, label, disabled, id, className }: SwitchProps) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-subtle-2 transition-colors duration-200 data-[state=checked]:bg-accent disabled:opacity-50',
        className,
      )}
    >
      <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 data-[state=checked]:translate-x-[18px]" />
    </RadixSwitch.Root>
  )
}
