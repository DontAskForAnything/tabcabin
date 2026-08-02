import { Check } from 'lucide-react'
import { Checkbox as RadixCheckbox } from 'radix-ui'
import { cn } from '../lib/cn'

export interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Rounded-square checkbox used for to-dos. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  size = 'md',
  className,
}: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={label}
      className={cn(
        'flex shrink-0 items-center justify-center border-[1.5px] border-ink-4 text-white transition-[background,border-color,transform] duration-150 active:scale-90 data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        size === 'md' ? 'size-[22px] rounded-[7px]' : 'size-[18px] rounded-[6px]',
        className,
      )}
    >
      <RadixCheckbox.Indicator>
        <Check size={size === 'md' ? 14 : 12} strokeWidth={3.2} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
