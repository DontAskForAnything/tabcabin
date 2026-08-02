import { ToggleGroup } from 'radix-ui'
import { type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** `accent`: selected item is filled with the accent (category tabs). `plain`: selected is a raised card. */
  tone?: 'accent' | 'plain'
  label: string
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  tone = 'plain',
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onValueChange(next as T)
      }}
      className={cn(
        'inline-flex flex-wrap gap-0.5 rounded-[13px] bg-subtle-2',
        tone === 'accent' ? 'p-1' : 'p-[3px]',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'inline-flex items-center gap-1.5 font-medium text-ink-2 transition-[background,color,box-shadow] duration-150 hover:text-ink',
            tone === 'accent'
              ? 'h-8 rounded-[10px] px-4 text-[13.5px] data-[state=on]:bg-accent data-[state=on]:font-semibold data-[state=on]:text-on-accent data-[state=on]:shadow-glow'
              : 'h-[30px] rounded-[9px] px-3 text-[13px] data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-ink data-[state=on]:shadow-tile',
          )}
        >
          {option.icon}
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
