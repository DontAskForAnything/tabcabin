import { type ComponentProps, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'bg-card text-ink shadow-tile hover:bg-raised',
  soft: 'bg-subtle text-ink hover:bg-subtle-2',
  ghost: 'text-ink-2 hover:bg-subtle hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-[9px] gap-1.5',
  md: 'h-10 px-4 text-[13.5px] rounded-[11px] gap-2',
  lg: 'h-11 px-5 text-[14.5px] rounded-xl gap-2',
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-[background,filter,box-shadow,color] duration-150 select-none disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
