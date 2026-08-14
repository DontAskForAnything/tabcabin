import { ChevronDown, Ellipsis, Layers } from 'lucide-react'
import { countItems } from '@tabhangar/core'
import { Button, cn, EmojiPickerPopover, IconButton } from '@tabhangar/ui'
import type { ReactNode } from 'react'
import type { BoardGroup } from '@/db/hooks'
import { updateGroup } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import type { BoardActions } from '../board/actions'
import { AddItem } from '../board/AddItem'
import { ItemView } from '../board/ItemView'
import type { ActiveContext } from '../useActive'
import { LinkCard } from './LinkCard'

export function CollectionSection({
  group,
  actions,
  active,
  menu,
  title,
  children,
  dropHighlight,
}: {
  group: BoardGroup
  actions: BoardActions
  active: ActiveContext
  menu?: ReactNode
  title?: ReactNode
  children?: ReactNode
  dropHighlight?: boolean
}) {
  const t = useT()
  const counts = countItems(group.allItems)
  const meta = [
    counts.links ? t('count.links', { count: counts.links }) : null,
    counts.notes ? t('count.notes', { count: counts.notes }) : null,
    counts.tasks ? t('count.tasks', { count: counts.tasks }) : null,
  ].filter(Boolean)

  return (
    <section
      aria-label={group.title || t('group.untitled')}
      className={cn(
        'rounded-card transition-[background,box-shadow] duration-150',
        'bg-card p-5 shadow-card',
        dropHighlight && 'bg-success-soft shadow-[0_0_0_2px_var(--success),var(--shadow-card)]',
      )}
    >
      <header className="mb-3.5 flex flex-wrap items-center gap-2.5">
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
          icon={<Layers size={14} />}
          onClick={() => void actions.openGroup(group)}
        >
          {t('stack.open')}
        </Button>
        {menu ?? <IconButton label={t('group.options')} icon={<Ellipsis size={16} />} size="sm" />}
      </header>
      {!group.collapsed &&
        (children ?? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {group.items.map((item) =>
              item.kind === 'link' ? (
                <LinkCard
                  key={item.id}
                  item={item}
                  group={group}
                  actions={actions}
                  active={active}
                />
              ) : (
                <ItemView
                  key={item.id}
                  item={item}
                  group={group}
                  actions={actions}
                  active={active}
                />
              ),
            )}
            <div className="[&>*]:mt-0 [&>button]:h-full [&>button]:min-h-[72px]">
              <AddItem groupId={group.id} actions={actions} />
            </div>
          </div>
        ))}
    </section>
  )
}
