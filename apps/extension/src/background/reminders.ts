import { displayHost, isDue, needsNotification, presetTime } from '@tabhangar/core'
import { liveQuery } from 'dexie'
import { loadReminders, type ReminderEntry } from '@/db/reminders'
import { completeReminder, markRemindersFired, snoozeReminder } from '@/db/repo'
import { translate } from '@/i18n/translate'
import { getSettings } from '@/settings/settings'
import { appUrl, hasNotifications } from '@/lib/browser'
import { setDueReminders } from './badge'

const ALARM = 'tabhangar:reminders'
const PREFIX = 'reminder:'
/** More due reminders than this are announced with one summary notification. */
const MAX_NOTIFICATIONS = 3

let entries: ReminderEntry[] = []

function itemTitle(entry: ReminderEntry): string {
  const { item } = entry
  if (item.kind === 'note') return item.text.split('\n')[0]?.slice(0, 120) || item.title
  return item.title || displayHost(item.url ?? '') || item.url || ''
}

async function schedule() {
  const now = Date.now()
  const next = entries.find((entry) => !isDue(entry.reminder, now))
  await browser.alarms.clear(ALARM)
  if (next) await browser.alarms.create(ALARM, { when: next.reminder.dueAt })

  const { locale } = await getSettings()
  const due = entries.filter((entry) => isDue(entry.reminder, now)).length
  setDueReminders(due, translate(locale, 'reminders.badgeTitle', { count: due }))
}

let running: Promise<void> = Promise.resolve()

/** Shows notifications for reminders that became due and refreshes the badge. */
export function checkReminders(): Promise<void> {
  running = running.then(check).catch((error) => console.error(error))
  return running
}

async function check() {
  const now = Date.now()
  const fresh = entries.filter((entry) => needsNotification(entry.reminder, now))
  if (fresh.length > 0) {
    if (await hasNotifications()) await notify(fresh)
    await markRemindersFired(fresh.map((entry) => entry.reminder.id))
  }
  await schedule()
}

async function notify(fresh: ReminderEntry[]) {
  const { locale } = await getSettings()
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(locale, key, params)
  const iconUrl = browser.runtime.getURL('/icon/128.png')
  if (fresh.length > MAX_NOTIFICATIONS) {
    await browser.notifications.create(`${PREFIX}all`, {
      type: 'list',
      iconUrl,
      title: t('reminders.notifyMany', { count: fresh.length }),
      message: '',
      items: fresh.slice(0, 5).map((entry) => ({
        title: itemTitle(entry),
        message: `${entry.group.emoji} ${entry.group.title}`.trim(),
      })),
      priority: 2,
    })
    return
  }
  for (const entry of fresh) {
    await browser.notifications.create(`${PREFIX}${entry.reminder.id}`, {
      type: 'basic',
      iconUrl,
      title: itemTitle(entry),
      message: `${entry.group.emoji} ${entry.group.title}`.trim(),
      contextMessage: entry.item.url ? displayHost(entry.item.url) : t('reminders.title'),
      buttons: [{ title: t('reminders.done') }, { title: t('reminders.snoozeHour') }],
      priority: 2,
      requireInteraction: true,
    })
  }
}

async function openReminder(notificationId: string) {
  const id = notificationId.slice(PREFIX.length)
  const entry = entries.find((e) => e.reminder.id === id)
  if (entry?.item.url) await browser.tabs.create({ url: entry.item.url })
  else await browser.tabs.create({ url: appUrl('reminders') })
}

function listenToNotifications() {
  if (!browser.notifications?.onClicked) return
  browser.notifications.onClicked.addListener((notificationId) => {
    if (!notificationId.startsWith(PREFIX)) return
    void browser.notifications.clear(notificationId)
    void openReminder(notificationId)
  })
  browser.notifications.onButtonClicked.addListener((notificationId, button) => {
    if (!notificationId.startsWith(PREFIX)) return
    const id = notificationId.slice(PREFIX.length)
    void browser.notifications.clear(notificationId)
    if (button === 0) void completeReminder(id)
    else void snoozeReminder(id, presetTime('hour', Date.now()))
  })
}

/** Keeps one alarm set for the next reminder and announces due ones. */
export function startReminders() {
  liveQuery(loadReminders).subscribe({
    next: (next) => {
      entries = next
      void checkReminders()
    },
    error: (error) => console.error(error),
  })
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void checkReminders()
  })
  listenToNotifications()
  browser.permissions.onAdded.addListener((granted) => {
    if (granted.permissions?.includes('notifications')) listenToNotifications()
  })
}
