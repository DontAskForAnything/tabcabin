import { AppWindow, ChevronDown, Ellipsis, Layers } from 'lucide-react'
import { countItems } from '@tabcabin/core'
import { Button, cn, EmojiPickerPopover, IconButton } from '@tabcabin/ui'
import type { ReactNode } from 'react'
import type { BoardGroup } from '@/db/hooks'
import { updateGroup } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { DEFAULT_SETTINGS } from '@/settings/settings'
import type { BoardActions } from '../board/actions'
import { AddItem } from '../board/AddItem'
import { ItemList } from '../board/ItemList'
import { ItemView } from '../board/ItemView'
import { DoneFold } from '../board/done/DoneFold'
import { useDoneSplit } from '../board/done/useDoneSplit'
import type { ActiveContext } from '../useActive'
import { useGroupDnd } from '../dnd/hooks'
import { LinkCard } from './LinkCard'

export function CollectionSection({
  group,
  actions,
  active,
  menu,
  title,
  children,
  index,
}: {
  index: number
  group: BoardGroup
  actions: BoardActions
  active: ActiveContext
  menu?: ReactNode
  title?: ReactNode
  children?: ReactNode
}) {
  const t = useT()
  const openHere = (active.settings?.openGroupIn ?? DEFAULT_SETTINGS.openGroupIn) === 'here'
  const counts = countItems(group.allItems)
  const split = useDoneSplit(group.items)
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
      className={cn(
        'rounded-card transition-[background,box-shadow] duration-150',
        'bg-card p-5 shadow-card',
        dnd.dragging && 'opacity-40',
        dnd.receiving && 'bg-success-soft shadow-[0_0_0_2px_var(--success),var(--shadow-card)]',
      )}
    >
      <header
        className="mb-3.5 flex cursor-grab flex-wrap items-center gap-2.5 active:cursor-grabbing"
        {...dnd.handleProps}
      >
        <IconButton
          label={group.collapsed ? t('group.expand') : t('group.collapse')}
          icon={
            <ChevronDown
              size={16}
              className={cn('transition-transform', group.collapsed && '-rotate-90')}
            />
          }
          size="sm"
          tooltip={false}
          onClick={() => void updateGroup(group.id, { collapsed: !group.collapsed })}
        />
        {active.settings?.showGroupEmoji !== false && (
          <EmojiPickerPopover
            onSelect={(emoji) => void updateGroup(group.id, { emoji })}
            emojibaseUrl={emojiBaseUrl()}
            locale={active.settings?.locale}
          >
            <button
              type="button"
              aria-label={t('group.changeEmoji')}
              className="rounded-lg text-[24px] leading-none transition-transform hover:scale-110"
            >
              {group.emoji}
            </button>
          </EmojiPickerPopover>
        )}
        <div className="min-w-0">{title}</div>
        <span className="text-[12.5px] text-ink-3">{meta.join(' · ')}</span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="soft"
          className="bg-accent-soft text-accent-ink hover:bg-accent-soft"
          icon={openHere ? <Layers size={14} /> : <AppWindow size={14} />}
          onClick={() => void actions.openGroup(group, !openHere)}
        >
          {t('stack.open')}
        </Button>
        {menu ?? <IconButton label={t('group.options')} icon={<Ellipsis size={16} />} size="sm" />}
      </header>
      {!group.collapsed &&
        (children ?? (
          <ItemList
            groupId={group.id}
            items={split.open}
            layout="grid"
            renderItem={(item) =>
              item.kind === 'link' ? (
                <LinkCard item={item} group={group} actions={actions} active={active} />
              ) : (
                <ItemView item={item} group={group} actions={actions} active={active} />
              )
            }
            extra={
              <div className="[&>*]:mt-0 [&>button]:h-full [&>button]:min-h-[72px]">
                <AddItem groupId={group.id} actions={actions} />
              </div>
            }
          />
        ))}
      {!group.collapsed && !children && (
        <DoneFold
          group={group}
          done={split.done}
          landing={split.landing}
          actions={actions}
          active={active}
        />
      )}
    </section>
  )
}
