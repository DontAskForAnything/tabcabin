import { type ComponentProps, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Tooltip } from './Tooltip'

export type IconButtonVariant = 'plain' | 'tile' | 'soft' | 'accent'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const variants: Record<IconButtonVariant, string> = {
  plain: 'text-ink-3 hover:bg-subtle hover:text-ink',
  tile: 'bg-card text-ink-2 shadow-tile hover:text-ink',
  soft: 'bg-subtle text-ink-2 hover:bg-subtle-2 hover:text-ink',
  accent: 'bg-accent-soft text-accent-ink hover:brightness-105',
}

const sizes: Record<IconButtonSize, string> = {
  xs: 'size-6 rounded-[7px]',
  sm: 'size-7 rounded-lg',
  md: 'size-9 rounded-[10px]',
  lg: 'size-10 rounded-xl',
}

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Accessible name; also shown as a tooltip unless `tooltip={false}`. */
  label: string
  icon: ReactNode
  variant?: IconButtonVariant
  size?: IconButtonSize
  tooltip?: boolean
  badge?: ReactNode
}

export function IconButton({
  label,
  icon,
  variant = 'plain',
  size = 'md',
  tooltip = true,
  badge,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {badge !== undefined && badge !== null && badge !== false && (
        <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-canvas bg-danger px-1 text-[11px] leading-none font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
  return tooltip ? <Tooltip label={label}>{button}</Tooltip> : button
}
