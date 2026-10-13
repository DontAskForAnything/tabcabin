import { INBOX_EMOJI } from '@tabcabin/core'
import { cn } from '@tabcabin/ui'
import type { BoardGroup } from '@/db/hooks'
import { useT } from '@/i18n'
import { LinkCard } from '../../collections/LinkCard'
import type { ActiveContext } from '../../useActive'
import type { BoardActions } from '../actions'
import { ItemList } from '../ItemList'
import { ItemView } from '../ItemView'
import { DEFAULT_GROUP_WIDTH } from '../group/width'

/**
 * Things saved without a group, first on every board until they are sorted: drag them into a
 * group or use "Move to" on each one. The column goes away once it is empty.
 */
export function InboxColumn({
  inbox,
  actions,
  active,
  compact,
  wide,
}: {
  inbox: BoardGroup
  actions: BoardActions
  active: ActiveContext
  compact?: boolean
  /** Full width above the sections of the collections view. */
  wide?: boolean
}) {
  const t = useT()
  return (
    <section
      aria-label={t('inbox.title')}
      style={{ width: compact || wide ? undefined : DEFAULT_GROUP_WIDTH }}
      className={cn(
        'relative flex shrink-0 flex-col rounded-card border border-dashed border-accent/40 bg-card px-[18px] pt-5 pb-4 shadow-card dense:px-3.5 dense:pt-3.5 dense:pb-3',
        (compact || wide) && 'w-full',
      )}
    >
      <header className="flex items-center gap-3 px-1 pb-2 dense:pb-1.5">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center text-[36px] leading-none dense:size-9 dense:text-[26px]"
        >
          {INBOX_EMOJI}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-semibold tracking-[-0.015em]">
            {t('inbox.title')}
          </h2>
          <p className="mt-1 inline-flex rounded-[7px] bg-accent-soft px-2 py-[3px] text-[12px] font-medium text-accent-ink">
            {t('inbox.count', { count: inbox.items.length })}
          </p>
        </div>
      </header>
      <p className="mb-3 px-1 text-[12.5px] leading-snug text-ink-3">{t('inbox.hint')}</p>
      <ItemList
        groupId={inbox.id}
        items={inbox.items}
        layout={wide ? 'grid' : 'list'}
        renderItem={(item) =>
          wide && item.kind === 'link' ? (
            <LinkCard item={item} group={inbox} actions={actions} active={active} />
          ) : (
            <ItemView item={item} group={inbox} actions={actions} active={active} />
          )
        }
      />
    </section>
  )
}
