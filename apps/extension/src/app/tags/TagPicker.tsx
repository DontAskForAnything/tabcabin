import { findTag, type Tag, TAG_LIMITS, tagName } from '@tabcabin/core'
import { cn } from '@tabcabin/ui'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Translate } from '@/i18n'
import { TagChip } from './TagChip'

/**
 * Picks tags: the chosen ones as pills with ×, a field that adds a tag by name (an existing one or
 * a new one), and the other tags to click. It reads nothing itself, so the save popover on web
 * pages can use it too.
 */
export function TagPicker({
  tags,
  t,
  chosen,
  onAdd,
  onRemove,
  autoFocus,
  id,
  showCount = true,
}: {
  /** Every tag of the account. */
  tags: readonly Tag[]
  t: Translate
  chosen: readonly Pick<Tag, 'id' | 'name' | 'color'>[]
  /** A name typed in the field, or an existing tag clicked. */
  onAdd: (name: string) => void
  onRemove: (tag: Pick<Tag, 'id' | 'name' | 'color'>) => void
  autoFocus?: boolean
  id?: string
  /** Says how many of the account's tags are used (only a problem is said without it). */
  showCount?: boolean
}) {
  const [text, setText] = useState('')
  const name = tagName(text)
  const chosenIds = new Set(chosen.map((tag) => tag.id))
  const wanted = name.toLocaleLowerCase()
  const others = tags.filter(
    (tag) => !chosenIds.has(tag.id) && tag.name.toLocaleLowerCase().includes(wanted),
  )
  const isNew = !!name && !findTag(tags, name)
  const accountFull = tags.length >= TAG_LIMITS.perAccount
  const itemFull = chosen.length >= TAG_LIMITS.perItem

  const add = (value: string) => {
    if (!tagName(value) || itemFull) return
    onAdd(value)
    setText('')
  }

  return (
    <div className="flex flex-col gap-2.5">
      <label
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded-[11px] bg-subtle-2 px-2.5 py-1.5 transition-shadow focus-within:shadow-[0_0_0_2px_var(--focus)]',
        )}
      >
        {chosen.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            onRemove={() => onRemove(tag)}
            removeLabel={t('tags.remove', { name: tag.name })}
          />
        ))}
        <input
          id={id}
          value={text}
          autoFocus={autoFocus}
          disabled={itemFull}
          maxLength={TAG_LIMITS.nameLength + 2}
          placeholder={itemFull ? '' : t('tags.placeholder')}
          aria-label={t('tags.placeholder')}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && name) {
              event.preventDefault()
              add(text)
            }
            if (event.key === 'Backspace' && !text && chosen.length)
              onRemove(chosen[chosen.length - 1]!)
          }}
          className="h-7 min-w-[110px] flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
        />
      </label>
      {(others.length > 0 || isNew) && !itemFull && (
        <div className="flex flex-wrap gap-1.5">
          {isNew && !accountFull && (
            <button
              type="button"
              onClick={() => add(text)}
              className="flex h-[22px] items-center gap-1 rounded-full border border-dashed border-line px-2 text-[12px] font-[560] text-ink-2 hover:text-ink"
            >
              <Plus size={11} strokeWidth={2.6} />
              {t('tags.create', { name })}
            </button>
          )}
          {others.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => add(tag.name)}
              className="rounded-full transition-opacity hover:opacity-80"
            >
              <TagChip tag={tag} className="h-[22px] text-[12px]" />
            </button>
          ))}
        </div>
      )}
      {(showCount || (isNew && accountFull)) && (
        <p className="text-[12px] text-ink-3">
          {isNew && accountFull
            ? t('tags.full', { max: TAG_LIMITS.perAccount })
            : tags.length === 0
              ? t('tags.none')
              : t('tags.left', { count: tags.length, max: TAG_LIMITS.perAccount })}
        </p>
      )}
    </div>
  )
}
