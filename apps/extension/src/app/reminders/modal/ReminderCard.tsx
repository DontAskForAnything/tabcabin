import { displayUrl } from '@tabhangar/core'
import { cn, Favicon } from '@tabhangar/ui'
import { Image, Layers, Link2, ListTodo, Repeat, StickyNote } from 'lucide-react'
import type { ReminderEntry } from '@/db/reminders'
import { useLocale, useT } from '@/i18n'
import { faviconUrl, hostSeed, openUrl } from '@/lib/browser'
import type { ActiveContext } from '../../useActive'
import { formatTime, repeatLabel } from '../format'
import { itemLabel } from '../ReminderEditor'
import { ReminderButtons } from './ReminderButtons'
import { useReminderActions } from './useReminderActions'

function KindIcon({ entry }: { entry: ReminderEntry }) {
  const { item } = entry
  const size = 13
  if (item.kind === 'link') return <Link2 size={size} />
  if (item.kind === 'image') return <Image size={size} />
  if (item.kind === 'stack') return <Layers size={size} />
  return item.todo ? <ListTodo size={size} /> : <StickyNote size={size} />
}

export function ReminderCard({
  entry,
  due,
  now,
  active,
}: {
  entry: ReminderEntry
  due: boolean
  now: number
  active: ActiveContext
}) {
  const t = useT()
  const locale = useLocale()
  const actions = useReminderActions(entry, active, now)
  const { reminder, item, group } = entry
  const repeat = repeatLabel(reminder, locale, t)
  const repeating = reminder.repeat !== 'none'

  return (
    <article
      aria-label={itemLabel(item)}
      className={cn(
        'overflow-hidden rounded-[15px] transition-shadow',
        due ? 'bg-card shadow-[0_0_0_1.5px_var(--accent)]' : 'bg-subtle',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 text-[12px] font-semibold',
          due ? 'bg-accent text-on-accent' : 'bg-subtle-2 text-ink-2',
        )}
      >
        <KindIcon entry={entry} />
        <span className="tabular-nums">{formatTime(reminder.dueAt, locale)}</span>
        {repeat && (
          <span
            className={cn(
              'flex min-w-0 items-center gap-1 rounded-md px-1.5 py-px font-medium',
              due ? 'bg-white/20' : 'bg-card',
            )}
          >
            <Repeat size={11} className="shrink-0" />
            <span className="truncate">{repeat}</span>
          </span>
        )}
        <span className={cn('ml-auto truncate font-medium', due ? 'opacity-85' : 'text-ink-3')}>
          {group.emoji} {group.title}
        </span>
      </div>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={() =>
            item.url ? void openUrl(item.url, { newTab: true }) : void actions.goTo()
          }
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {item.url ? (
            <Favicon
              src={[faviconUrl(item.url), item.favIconUrl]}
              seed={hostSeed(item.url, item.title)}
              size="md"
            />
          ) : (
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background: `var(--note-${item.color ?? 'sand'}-bg)`,
                color: `var(--note-${item.color ?? 'sand'}-ink)`,
              }}
            >
              <KindIcon entry={entry} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block text-[14px] leading-snug font-[550]',
                item.url ? 'truncate' : 'line-clamp-2',
                item.done && 'text-ink-3 line-through',
              )}
            >
              {itemLabel(item) || t('item.untitled')}
            </span>
            {item.url && (
              <span className="block truncate text-[12.5px] text-ink-3">
                {displayUrl(item.url)}
              </span>
            )}
          </span>
        </button>
        <ReminderButtons due={due} repeating={repeating} actions={actions} />
      </div>
    </article>
  )
}
