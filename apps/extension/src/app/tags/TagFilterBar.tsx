import { cn } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { TagChip } from './TagChip'
import { useTagList } from './TagsContext'
import { useTagFilter } from './useTagFilter'

/** Under the top bar while the board is filtered: which tags, each with × to drop it. */
export function TagFilterBar({ compact }: { compact: boolean }) {
  const t = useT()
  const { tags } = useTagList()
  const filter = useTagFilter()
  const toggle = useUi((s) => s.toggleTagFilter)
  const clear = useUi((s) => s.clearTagFilter)
  if (filter.size === 0) return null
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 pb-3 text-[12.5px]',
        compact ? 'px-4' : 'px-7',
      )}
    >
      <span className="mr-1 text-ink-3">{t('tags.showing')}</span>
      {tags
        .filter((tag) => filter.has(tag.id))
        .map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            className="h-[22px] text-[12px]"
            onRemove={() => toggle(tag.id)}
            removeLabel={t('tags.remove', { name: tag.name })}
          />
        ))}
      <button
        type="button"
        onClick={clear}
        className="ml-1 text-ink-3 underline-offset-2 hover:text-ink hover:underline"
      >
        {t('tags.clearFilter')}
      </button>
    </div>
  )
}
