import { Trash } from 'lucide-react'
import type { Item, Reminder } from '@tabhangar/core'
import { Button, Modal } from '@tabhangar/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '@/db/db'
import { getItemReminder, removeReminder, setReminder } from '@/db/repo'
import { useLocale, useT } from '@/i18n'
import { requestNotifications } from '@/lib/browser'
import { type Settings, updateSettings } from '@/settings/settings'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import { formatDue } from './format'
import { ReminderFields } from './ReminderFields'
import { useReminderForm } from './useReminderForm'

export function itemLabel(item: Item): string {
  if (item.kind === 'note') return item.text.split('\n')[0]?.trim() || item.title
  return item.title || item.url || ''
}

/** Modal to set, change or remove the reminder of one item. */
export function ReminderEditor({
  itemId,
  settings,
}: {
  itemId: string | null
  settings: Settings | undefined
}) {
  // Keep rendering the last item while the dialog animates out.
  const [shown, setShown] = useState<{ id: string; session: number } | null>(null)
  useEffect(() => {
    if (itemId) setShown((prev) => ({ id: itemId, session: (prev?.session ?? 0) + 1 }))
  }, [itemId])
  const data = useLiveQuery(
    async () =>
      shown
        ? { item: await db.items.get(shown.id), reminder: await getItemReminder(shown.id) }
        : null,
    [shown?.id],
  )
  if (!shown || !data?.item || data.item.id !== shown.id) return null
  return (
    <ReminderDialog
      key={shown.session}
      open={itemId !== null}
      item={data.item}
      reminder={data.reminder}
      settings={settings}
    />
  )
}

function ReminderDialog({
  open,
  item,
  reminder,
  settings,
}: {
  open: boolean
  item: Item
  reminder: Reminder | undefined
  settings: Settings | undefined
}) {
  const t = useT()
  const locale = useLocale()
  const editReminder = useUi((s) => s.editReminder)
  const close = () => editReminder(null)
  const form = useReminderForm(reminder)
  const error = 'error' in form.result

  const save = () => {
    if (!('input' in form.result)) return
    const input = form.result.input
    // The permission prompt needs the click's user gesture, so ask before anything async.
    const asked = settings && !settings.notificationsAsked ? requestNotifications() : null
    close()
    void (async () => {
      offerUndo(await setReminder(item.id, input), {
        title: t('reminders.saved', { date: formatDue(input.dueAt, locale, t) }),
        undoLabel: t('common.undo'),
      })
      if (asked) {
        await asked
        await updateSettings({ notificationsAsked: true })
      }
    })()
  }

  const remove = async () => {
    if (!reminder) return
    close()
    offerUndo(await removeReminder(reminder.id), {
      title: t('reminders.removed'),
      undoLabel: t('common.undo'),
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('item.reminder')}
      description={<span className="line-clamp-2 break-all">{itemLabel(item)}</span>}
      size="sm"
      footer={
        <>
          {reminder && (
            <Button
              variant="ghost"
              icon={<Trash size={15} />}
              className="mr-auto text-danger hover:text-danger"
              onClick={() => void remove()}
            >
              {t('reminders.remove')}
            </Button>
          )}
          <Button variant="ghost" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={error} onClick={save}>
            {t('reminders.set')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <ReminderFields form={form} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
