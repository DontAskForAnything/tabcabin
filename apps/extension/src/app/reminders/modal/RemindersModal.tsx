import { splitReminders } from '@tabhangar/core'
import { Button, Modal } from '@tabhangar/ui'
import { BellOff, BellRing, Check, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useReminders } from '@/db/reminders'
import { completeReminder } from '@/db/repo'
import { useT } from '@/i18n'
import { hasNotifications, openUrl, requestNotifications } from '@/lib/browser'
import { updateSettings } from '@/settings/settings'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../../useActive'
import { useNow } from '../useDue'
import { ReminderDayList } from './ReminderDayList'
import { ReminderSection } from './ReminderSection'

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
          <ReminderSection
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
            <ReminderDayList entries={due} due now={now} active={active} />
          </ReminderSection>
        )}
        {upcoming.length > 0 && (
          <ReminderSection title={t('reminders.upcoming')} count={upcoming.length}>
            <ReminderDayList entries={upcoming} due={false} now={now} active={active} />
          </ReminderSection>
        )}
      </div>
    </Modal>
  )
}
