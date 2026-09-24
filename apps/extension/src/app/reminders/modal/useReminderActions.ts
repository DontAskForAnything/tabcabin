import type { ReminderEntry } from '@/db/reminders'
import { completeReminder, removeReminder, snoozeReminder } from '@/db/repo'
import { useLocale, useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import { revealItem, type ActiveContext } from '../../useActive'
import { formatDue } from '../format'

/** What can be done with a reminder in the list; every change can be undone. */
export function useReminderActions(entry: ReminderEntry, active: ActiveContext, now: number) {
  const t = useT()
  const locale = useLocale()
  const editReminder = useUi((s) => s.editReminder)
  const close = useUi((s) => s.closeModal)
  const { reminder, item, category, workspace } = entry
  const undoLabel = t('common.undo')

  return {
    done: async () =>
      offerUndo(await completeReminder(reminder.id), {
        title: t('reminders.completed'),
        undoLabel,
      }),
    remove: async () =>
      offerUndo(await removeReminder(reminder.id), { title: t('reminders.removed'), undoLabel }),
    snooze: async (until: number) =>
      offerUndo(await snoozeReminder(reminder.id, until), {
        title: t('reminders.snoozed', { date: formatDue(until, locale, t, now) }),
        undoLabel,
      }),
    edit: () => editReminder(item.id),
    goTo: async () => {
      if (!active.settings) return
      close()
      await revealItem(active.settings, {
        workspaceId: workspace.id,
        categoryId: category.id,
        itemId: item.parentId ?? item.id,
      })
    },
  }
}

export type ReminderActions = ReturnType<typeof useReminderActions>
