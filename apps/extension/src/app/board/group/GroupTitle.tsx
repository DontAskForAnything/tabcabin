import { cn } from '@tabcabin/ui'
import { useEffect, useRef, useState } from 'react'
import type { BoardGroup } from '@/db/hooks'
import { updateGroup } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'

export function GroupTitle({ group }: { group: BoardGroup }) {
  const t = useT()
  const focusId = useUi((s) => s.focusGroupTitleId)
  const setFocus = useUi((s) => s.setFocusGroupTitle)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(group.title)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusId === group.id) {
      setValue(group.title)
      setEditing(true)
      setFocus(null)
    }
  }, [focusId, group.id, group.title, setFocus])

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = value.trim()
    if (next !== group.title) void updateGroup(group.id, { title: next })
  }

  if (editing)
    return (
      <input
        ref={ref}
        value={value}
        placeholder={t('group.titlePlaceholder')}
        onChange={(event) => setValue(event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') {
            setValue(group.title)
            setEditing(false)
          }
        }}
        className="-mx-1 w-[calc(100%+8px)] rounded-lg bg-subtle px-1 text-[17px] font-semibold tracking-[-0.015em] outline-none placeholder:text-ink-4"
      />
    )
  return (
    <h2
      className={cn(
        'cursor-text truncate text-[17px] font-semibold tracking-[-0.015em]',
        !group.title && 'text-ink-3',
      )}
      onClick={() => {
        setValue(group.title)
        setEditing(true)
      }}
    >
      {group.title || t('group.untitled')}
    </h2>
  )
}
