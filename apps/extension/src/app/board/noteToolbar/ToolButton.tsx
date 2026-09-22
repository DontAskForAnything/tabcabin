import { cn, IconButton } from '@tabhangar/ui'
import type { ReactNode } from 'react'
import { keepFocus } from './keepFocus'

export function ToolButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string
  icon: ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <IconButton
      label={label}
      icon={icon}
      onClick={onClick}
      onMouseDown={keepFocus}
      variant={active ? 'accent' : 'plain'}
      className={cn('size-9 rounded-[11px]', !active && 'text-ink-2')}
    />
  )
}
