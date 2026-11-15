import { cn } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { TagChip } from './TagChip'
import { useItemTags } from './TagsContext'

/** How many tags a card shows; the rest is "+N". */
const SHOWN = 2

/** The tags of an item as pills (the first two, then "+N"). Nothing when it has none. */
export function ItemTags({
  tagIds,
  className,
}: {
  tagIds: readonly string[] | undefined
  className?: string
}) {
  const t = useT()
  const tags = useItemTags(tagIds)
  if (tags.length === 0) return null
  const more = tags.length - SHOWN
  return (
    <span className={cn('flex min-w-0 flex-none items-center gap-1', className)}>
      {tags.slice(0, SHOWN).map((tag) => (
        <TagChip key={tag.id} tag={tag} />
      ))}
      {more > 0 && (
        <span
          title={tags
            .slice(SHOWN)
            .map((tag) => tag.name)
            .join(', ')}
          aria-label={t('tags.more', { count: more })}
          className="flex h-[18px] items-center rounded-full bg-subtle px-1.5 text-[11px] font-[560] text-ink-2"
        >
          +{more}
        </span>
      )}
    </span>
  )
}
