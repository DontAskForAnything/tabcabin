import { Bell, BellRing, Repeat } from 'lucide-react'
import { isDue, type Reminder } from '@tabcabin/core'
import { cn } from '@tabcabin/ui'
import { useLocale, useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { formatDue } from './format'
import { useNow } from './useDue'

/** Small pill on an item with its next reminder; opens the reminder editor. */
export function ReminderChip({ reminder, className }: { reminder: Reminder; className?: string }) {
  const t = useT()
  const locale = useLocale()
  const editReminder = useUi((s) => s.editReminder)
  const now = useNow(60_000)
  const due = isDue(reminder, now)
  const label = formatDue(reminder.dueAt, locale, t, now)
  return (
    <button
      type="button"
      aria-label={`${t('item.reminder')}: ${label}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        editReminder(reminder.itemId)
      }}
      className={cn(
        'inline-flex h-[22px] max-w-full items-center gap-1 rounded-[7px] px-1.5 text-[11.5px] font-semibold transition-[filter] hover:brightness-95',
        due ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-ink',
        className,
      )}
    >
      {due ? <BellRing size={12} className="shrink-0" /> : <Bell size={12} className="shrink-0" />}
      <span className="truncate">{label}</span>
      {reminder.repeat !== 'none' && <Repeat size={11} className="shrink-0 opacity-80" />}
    </button>
  )
}
