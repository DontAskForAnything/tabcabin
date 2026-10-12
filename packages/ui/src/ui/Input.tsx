import { type ComponentProps, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { FIELD_INPUT } from './fieldInput'

export interface InputProps extends ComponentProps<'input'> {
  leading?: ReactNode
  trailing?: ReactNode
  inputClassName?: string
}

export function Input({ leading, trailing, className, inputClassName, ...props }: InputProps) {
  return (
    <label
      className={cn(
        'flex h-10 items-center gap-2 rounded-[11px] bg-subtle-2 px-3 text-ink-3 transition-shadow focus-within:shadow-[0_0_0_2px_var(--focus)]',
        className,
      )}
    >
      {leading}
      <input
        className={cn(
          'h-full min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3',
          inputClassName,
        )}
        {...props}
      />
      {trailing}
    </label>
  )
}

export interface FieldProps extends ComponentProps<'input'> {
  label: string
  hint?: ReactNode
}

/** Labeled text field with a card look (forms, modals). */
export function Field({ label, hint, className, id, ...props }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)} htmlFor={id}>
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <input id={id} className={FIELD_INPUT} {...props} />
      {hint && <span className="text-[12.5px] text-ink-3">{hint}</span>}
    </label>
  )
}
