import { useEffect, useRef, useState } from 'react'
import type { BoardItem } from '@/db/hooks'
import { updateItem } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'

/**
 * A stack's name, or how many links it holds, above its sites; a field while it is being renamed.
 * A named stack keeps its count next to the sites.
 */
export function StackTitle({
  stack,
  hosts,
  renaming,
}: {
  stack: BoardItem
  hosts: string[]
  renaming: boolean
}) {
  const t = useT()
  const setRename = useUi((s) => s.setRenameStack)
  const [value, setValue] = useState(stack.title)
  const ref = useRef<HTMLInputElement>(null)
  const count = t('stack.title', { count: stack.children.length })

  useEffect(() => {
    if (!renaming) return
    setValue(stack.title)
    // A frame later: the menu that asked for it hands focus back as it closes.
    const frame = requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [renaming, stack.title])

  const finish = (save: boolean) => {
    setRename(null)
    const next = value.trim()
    if (save && next !== stack.title) void updateItem(stack.id, { title: next })
  }

  return (
    <span className="min-w-0 flex-1">
      {renaming ? (
        <input
          ref={ref}
          value={value}
          aria-label={t('stack.rename')}
          placeholder={t('stack.namePlaceholder')}
          onChange={(event) => setValue(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          onBlur={() => finish(true)}
          onKeyDown={(event) => {
            // Keys stay in the field: Space would pick the stack up to drag it.
            event.stopPropagation()
            if (event.key === 'Enter') finish(true)
            if (event.key === 'Escape') finish(false)
          }}
          className="-mx-1 block w-[calc(100%+8px)] rounded-lg bg-subtle px-1 text-[14px] font-semibold outline-none placeholder:text-ink-4"
        />
      ) : (
        <span className="block truncate text-[14px] font-semibold">{stack.title || count}</span>
      )}
      <span className="block truncate text-[12px] text-ink-3">
        {(stack.title ? [count, ...hosts] : hosts).join(' · ')}
      </span>
    </span>
  )
}
