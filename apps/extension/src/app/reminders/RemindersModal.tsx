import {
  BellOff,
  BellRing,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Image,
  Layers,
  Link2,
  ListTodo,
  LocateFixed,
  Pencil,
  Repeat,
  SkipForward,
  StickyNote,
  Trash,
} from 'lucide-react'
import { displayUrl, presetTime, splitReminders, TIME_PRESETS } from '@tabhangar/core'
import {
  Button,
  cn,
  Favicon,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  Modal,
} from '@tabhangar/ui'
import { useEffect, useState, type ReactNode } from 'react'
import { type ReminderEntry, useReminders } from '@/db/reminders'
import { completeReminder, removeReminder, snoozeReminder } from '@/db/repo'
import { type Locale, useLocale, useT } from '@/i18n'
import {
  faviconUrl,
  hasNotifications,
  hostSeed,
  openUrl,
  requestNotifications,
} from '@/lib/browser'
import { updateSettings } from '@/settings/settings'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import { revealItem, type ActiveContext } from '../useActive'
import { formatDue, formatTime, repeatLabel } from './format'
import { itemLabel } from './ReminderEditor'
import { useNow } from './useDue'

export function RemindersModal({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const reminders = useReminders()
  const now = useNow(15_000)
  const [notifications, setNotifications] = useState(true)
  useEffect(() => {
    if (open) void hasNotifications().then(setNotifications)
  }, [open])

  const { due, upcoming } = splitReminders(
    (reminders ?? []).map((entry) => ({ ...entry, dueAt: entry.reminder.dueAt })),
    now,
  )
  const dueLinks = due.filter((entry) => entry.item.url)

  const doneAll = async () => {
    const ok = await confirmDialog({
      title: t('reminders.doneAll'),
      description: t('reminders.doneAllConfirm', { count: due.length }),
      confirmLabel: t('reminders.doneAll'),
      cancelLabel: t('common.cancel'),
    })
    if (!ok) return
    const undo = []
    for (const entry of due) undo.unshift(...(await completeReminder(entry.reminder.id)).undo)
    offerUndo({ undo }, { title: t('reminders.completed'), undoLabel: t('common.undo') })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('reminders.title')}
      size="md"
    >
      <div className="flex flex-col gap-6">
        {!notifications && (
          <div className="flex items-center gap-3 rounded-[14px] bg-subtle px-4 py-3 text-[13px] text-ink-2">
            <BellOff size={17} className="shrink-0 text-ink-3" />
            <span className="flex-1">{t('reminders.notificationsOff')}</span>
            <Button
              size="sm"
              onClick={() => {
                void requestNotifications().then((granted) => {
                  setNotifications(granted)
                  void updateSettings({ notificationsAsked: true })
                })
              }}
            >
              {t('reminders.notificationsOn')}
            </Button>
          </div>
        )}
        {reminders && reminders.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <div className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <BellRing size={26} />
            </div>
            <h3 className="text-[16px] font-semibold">{t('reminders.empty')}</h3>
            <p className="max-w-[340px] text-[13.5px] text-ink-3">{t('reminders.emptyHint')}</p>
          </div>
        )}
        {due.length > 0 && (
          <Section
            title={t('reminders.due')}
            count={due.length}
            actions={
              <>
                {dueLinks.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<ExternalLink size={14} />}
                    onClick={() => {
                      for (const entry of dueLinks)
                        void openUrl(entry.item.url!, { newTab: true, background: true })
                    }}
                  >
                    {t('reminders.openAll')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Check size={14} />}
                  onClick={() => void doneAll()}
                >
                  {t('reminders.doneAll')}
                </Button>
              </>
            }
          >
            <DayList entries={due} due now={now} active={active} />
          </Section>
        )}
        {upcoming.length > 0 && (
          <Section title={t('reminders.upcoming')} count={upcoming.length}>
            <DayList entries={upcoming} due={false} now={now} active={active} />
          </Section>
        )}
      </div>
    </Modal>
  )
}

function Section({
  title,
  count,
  actions,
  children,
}: {
  title: string
  count: number
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center gap-2">
        <h3 className="text-[12px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          {title}
        </h3>
        <span className="rounded-md bg-subtle-2 px-1.5 text-[11.5px] font-semibold text-ink-2">
          {count}
        </span>
        <div className="flex-1" />
        {actions}
      </div>
      {children}
    </section>
  )
}

function dayParts(ts: number, locale: Locale) {
  const date = new Date(ts)
  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
    day: date.getDate(),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
  }
}

function DayList({
  entries,
  due,
  now,
  active,
}: {
  entries: ReminderEntry[]
  due: boolean
  now: number
  active: ActiveContext
}) {
  const locale = useLocale()
  const days: { key: string; ts: number; entries: ReminderEntry[] }[] = []
  for (const entry of entries) {
    const date = new Date(entry.reminder.dueAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const last = days.at(-1)
    if (last?.key === key) last.entries.push(entry)
    else days.push({ key, ts: entry.reminder.dueAt, entries: [entry] })
  }
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const parts = dayParts(day.ts, locale)
        return (
          <div key={day.key} className="grid grid-cols-[52px_1fr] gap-3">
            <div className="flex flex-col items-center border-r-2 border-line pt-1.5 pr-3 text-center">
              <span className="text-[12px] font-medium text-ink-3 capitalize">{parts.weekday}</span>
              <span className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
                {parts.day}
              </span>
              <span className="text-[11.5px] text-ink-3">{parts.month}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2.5">
              {day.entries.map((entry) => (
                <ReminderCard
                  key={entry.reminder.id}
                  entry={entry}
                  due={due}
                  now={now}
                  active={active}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KindIcon({ entry }: { entry: ReminderEntry }) {
  const { item } = entry
  const size = 13
  if (item.kind === 'link') return <Link2 size={size} />
  if (item.kind === 'image') return <Image size={size} />
  if (item.kind === 'stack') return <Layers size={size} />
  return item.todo ? <ListTodo size={size} /> : <StickyNote size={size} />
}

function ReminderCard({
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
  const editReminder = useUi((s) => s.editReminder)
  const close = useUi((s) => s.closeModal)
  const { reminder, item, group, category, workspace } = entry
  const repeat = repeatLabel(reminder, locale, t)
  const repeating = reminder.repeat !== 'none'

  const done = async () =>
    offerUndo(await completeReminder(reminder.id), {
      title: t('reminders.completed'),
      undoLabel: t('common.undo'),
    })
  const remove = async () =>
    offerUndo(await removeReminder(reminder.id), {
      title: t('reminders.removed'),
      undoLabel: t('common.undo'),
    })
  const snooze = async (until: number) =>
    offerUndo(await snoozeReminder(reminder.id, until), {
      title: t('reminders.snoozed', { date: formatDue(until, locale, t, now) }),
      undoLabel: t('common.undo'),
    })
  const goTo = async () => {
    if (!active.settings) return
    close()
    await revealItem(active.settings, {
      workspaceId: workspace.id,
      categoryId: category.id,
      itemId: item.parentId ?? item.id,
    })
  }

  const primary = due
    ? { label: repeating ? t('reminders.doneRepeat') : t('reminders.done'), run: done }
    : { label: t('reminders.removeShort'), run: remove }

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
          onClick={() => (item.url ? void openUrl(item.url, { newTab: true }) : void goTo())}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {item.url ? (
            <Favicon
              src={faviconUrl(item.url) ?? item.favIconUrl}
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
        <div className="flex shrink-0 items-center gap-px">
          <Button
            size="sm"
            variant={due ? 'soft' : 'secondary'}
            className="rounded-r-[4px]"
            onClick={() => void primary.run()}
          >
            {primary.label}
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <Button
                size="sm"
                variant={due ? 'soft' : 'secondary'}
                aria-label={t('common.more')}
                className="rounded-l-[4px] px-2"
              >
                <ChevronDown size={14} />
              </Button>
            </MenuTrigger>
            <MenuContent align="end" className="min-w-[210px]">
              {due && (
                <MenuSub>
                  <MenuSubTrigger icon={<Clock size={14} />}>
                    {t('reminders.snooze')}
                  </MenuSubTrigger>
                  <MenuSubContent>
                    {TIME_PRESETS.map((preset) => (
                      <MenuItem
                        key={preset}
                        onSelect={() => void snooze(presetTime(preset, Date.now()))}
                      >
                        {t(`reminders.preset.${preset}`)}
                      </MenuItem>
                    ))}
                  </MenuSubContent>
                </MenuSub>
              )}
              {!due && repeating && (
                <MenuItem icon={<SkipForward size={14} />} onSelect={() => void done()}>
                  {t('reminders.skip')}
                </MenuItem>
              )}
              <MenuItem icon={<Pencil size={14} />} onSelect={() => editReminder(item.id)}>
                {t('reminders.edit')}
              </MenuItem>
              <MenuItem icon={<LocateFixed size={14} />} onSelect={() => void goTo()}>
                {t('reminders.goTo')}
              </MenuItem>
              {due && (
                <>
                  <MenuSeparator />
                  <MenuItem icon={<Trash size={14} />} danger onSelect={() => void remove()}>
                    {repeating ? t('reminders.stop') : t('reminders.remove')}
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
        </div>
      </div>
    </article>
  )
}
