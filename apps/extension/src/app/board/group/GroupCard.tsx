import { countItems } from '@tabcabin/core'
import { cn, EmojiPickerPopover } from '@tabcabin/ui'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { type CSSProperties, type ReactNode, useState } from 'react'
import type { BoardGroup } from '@/db/hooks'
import { updateGroup } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { useGroupDnd } from '../../dnd/hooks'
import type { ActiveContext } from '../../useActive'
import { AddItem } from '../AddItem'
import { ItemList } from '../ItemList'
import { ItemView } from '../ItemView'
import type { BoardActions } from '../actions'
import { GroupMenu } from './GroupMenu'
import { GroupResizeHandle } from './GroupResizeHandle'
import { RestoreButton } from './RestoreButton'
import { GroupTitle } from './GroupTitle'
import { DEFAULT_GROUP_WIDTH } from './width'

export interface GroupCardProps {
  group: BoardGroup
  index: number
  actions: BoardActions
  active: ActiveContext
  compact?: boolean
  style?: CSSProperties
  className?: string
  /** Rendered instead of the default item list. */
  children?: ReactNode
}

export function GroupCard({
  group,
  index,
  actions,
  active,
  compact,
  style,
  className,
  children,
}: GroupCardProps) {
  const t = useT()
  const [width, setWidth] = useState<number | null>(null)
  const effectiveWidth = compact ? undefined : (width ?? group.width ?? DEFAULT_GROUP_WIDTH)
  const counts = countItems(group.allItems)
  const meta = [
    counts.links ? t('count.links', { count: counts.links }) : null,
    counts.notes ? t('count.notes', { count: counts.notes }) : null,
    counts.tasks ? t('count.tasks', { count: counts.tasks }) : null,
  ].filter(Boolean)
  const dnd = useGroupDnd(group.id, group.categoryId, index, {
    kind: 'group',
    title: group.title || t('group.untitled'),
    subtitle: meta.join(' · '),
    emoji: group.emoji,
    count: 1,
  })

  return (
    <section
      ref={dnd.setNodeRef}
      data-dnd-group={group.id}
      aria-label={group.title || t('group.untitled')}
      style={{ ...style, width: effectiveWidth }}
      className={cn(
        'group/card relative flex shrink-0 flex-col rounded-card bg-card px-[18px] pt-5 pb-4 shadow-card transition-[box-shadow,background] duration-150 dense:px-3.5 dense:pt-3.5 dense:pb-3',
        compact && 'w-full',
        dnd.dragging && 'opacity-40',
        dnd.receiving && 'bg-success-soft shadow-[0_0_0_2px_var(--success),var(--shadow-card)]',
        className,
      )}
    >
      <header
        className="flex cursor-grab items-center gap-3 px-1 pb-3.5 active:cursor-grabbing dense:pb-2.5"
        {...dnd.handleProps}
      >
        {active.settings?.showGroupEmoji !== false && (
          <EmojiPickerPopover
            onSelect={(emoji) => void updateGroup(group.id, { emoji })}
            emojibaseUrl={emojiBaseUrl()}
            locale={active.settings?.locale}
          >
            <button
              type="button"
              aria-label={t('group.changeEmoji')}
              className="flex size-12 shrink-0 items-center justify-center rounded-[14px] text-[36px] leading-none transition-transform hover:scale-105 hover:bg-subtle dense:size-9 dense:text-[26px]"
            >
              {group.emoji}
            </button>
          </EmojiPickerPopover>
        )}
        <div className="min-w-0 flex-1">
          <GroupTitle group={group} />
          <button
            type="button"
            onClick={() => void updateGroup(group.id, { collapsed: !group.collapsed })}
            className="mt-1 inline-flex max-w-full items-center gap-0.5 rounded-[7px] bg-subtle px-2 py-[3px] text-[12px] font-medium text-ink-3 hover:text-ink-2"
          >
            <span className="truncate">{meta.length ? meta.join(' · ') : t('group.empty')}</span>
            {group.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        <RestoreButton group={group} actions={actions} />
        <GroupMenu group={group} actions={actions} active={active} />
      </header>

      {!group.collapsed && (
        <>
          {children ?? (
            <ItemList
              groupId={group.id}
              items={group.items}
              renderItem={(item) => (
                <ItemView item={item} group={group} actions={actions} active={active} />
              )}
            />
          )}
          <AddItem groupId={group.id} actions={actions} />
        </>
      )}

      {!compact && (
        <GroupResizeHandle
          width={effectiveWidth ?? DEFAULT_GROUP_WIDTH}
          onPreview={setWidth}
          onCommit={(next) => {
            setWidth(null)
            void updateGroup(group.id, { width: next })
          }}
          label={t('group.resetWidth')}
        />
      )}
    </section>
  )
}
