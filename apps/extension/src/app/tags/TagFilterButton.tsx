import { Check, ListFilter } from 'lucide-react'
import { cn, Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { TagChip } from './TagChip'
import { useTagList } from './TagsContext'
import { useTagFilter } from './useTagFilter'

const FOOT =
  'flex h-9 w-full items-center rounded-[10px] px-2 text-[13px] text-ink-2 hover:bg-subtle hover:text-ink'

/**
 * The tag filter next to Search: a round button (filled while a filter is on, with how many tags)
 * that opens the list of tags to tick. People without tags never see it.
 */
export function TagFilterButton() {
  const t = useT()
  const { tags } = useTagList()
  const filter = useTagFilter()
  const toggle = useUi((s) => s.toggleTagFilter)
  const clear = useUi((s) => s.clearTagFilter)
  const openModal = useUi((s) => s.openModal)
  if (tags.length === 0) return null
  const on = filter.size > 0
  const label = on ? t('tags.filterCount', { count: filter.size }) : t('tags.filter')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            'flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold shadow-tile transition-colors',
            on ? 'bg-accent text-on-accent' : 'bg-card text-ink-2 hover:text-ink',
          )}
        >
          <ListFilter size={17} />
          {on && <span className="tabular-nums">{filter.size}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-2">
        <p className="px-2 pt-1 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          {t('tags.filter')}
        </p>
        <div className="flex max-h-[320px] flex-col overflow-y-auto">
          {tags.map((tag) => {
            const checked = filter.has(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={tag.name}
                onClick={() => toggle(tag.id)}
                className="flex h-9 items-center gap-2.5 rounded-[10px] px-2 text-left hover:bg-subtle"
              >
                <span
                  className={cn(
                    'flex size-4 flex-none items-center justify-center rounded-[5px] border-[1.5px]',
                    checked ? 'border-accent bg-accent text-on-accent' : 'border-ink-3',
                  )}
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <TagChip tag={tag} className="h-5 text-[12px]" />
              </button>
            )
          })}
        </div>
        <div className="mx-1.5 my-1.5 h-px bg-line" />
        {on && (
          <button type="button" onClick={clear} className={FOOT}>
            {t('tags.clearFilter')}
          </button>
        )}
        <PopoverClose asChild>
          <button
            type="button"
            onClick={() => openModal({ type: 'settings', tab: 'tags' })}
            className={FOOT}
          >
            {t('tags.manage')}
          </button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  )
}
