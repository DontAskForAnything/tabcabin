import { Search, X } from 'lucide-react'
import { IconButton, Input, Kbd } from '@tabhangar/ui'
import { useEffect, useRef } from 'react'
import { useT } from '@/i18n'
import { isTyping } from '@/lib/keys'

/** Filters the open tabs; "/" anywhere jumps here, Escape clears it. */
export function TabFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const t = useT()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTyping(event)) {
        event.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Input
      ref={ref}
      leading={<Search size={15} />}
      trailing={
        value ? (
          <IconButton
            label={t('common.close')}
            icon={<X size={13} />}
            size="xs"
            tooltip={false}
            onClick={() => onChange('')}
          />
        ) : (
          <Kbd className="bg-card">/</Kbd>
        )
      }
      placeholder={t('panel.filter')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.key === 'Escape' && (onChange(''), event.currentTarget.blur())}
      className="h-9"
    />
  )
}
