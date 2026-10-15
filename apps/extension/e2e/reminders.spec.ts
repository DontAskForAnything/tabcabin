import { type BrowserContext, type Page, type Worker } from '@playwright/test'
import { expect, test } from './fixtures'

declare const chrome: typeof browser
declare const tabcabin: {
  checkReminders: () => Promise<void>
  db: {
    reminders: {
      toArray: () => Promise<{ id: string; dueAt: number; firedAt: number | null }[]>
      toCollection: () => { modify: (patch: object) => Promise<number> }
    }
  }
}

async function worker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
}

async function openBoard(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

async function setReminderInOneHour(page: Page, linkName: string) {
  await page.getByRole('link', { name: linkName }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Reminder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reminder' })
  await dialog.getByRole('button', { name: 'In 1 hour' }).click()
  await expect(dialog.getByRole('status')).toContainText('Next reminder')
  await dialog.getByRole('button', { name: 'Set reminder' }).click()
  await expect(dialog).toHaveCount(0)
}

test('sets a one-time reminder and lists it as coming up', async ({ context, extensionId }) => {
  const page = await openBoard(context, extensionId)
  await setReminderInOneHour(page, 'GitHub')
  await expect(page.getByText(/Reminder set for/)).toBeVisible()
  const group = page.getByRole('region', { name: 'Quick links' })
  // "In 1 hour" can fall on the next day late in the evening.
  await expect(group.getByRole('button', { name: /^Reminder: (Today|Tomorrow)/ })).toBeVisible()

  await page.getByRole('button', { name: 'Reminders' }).click()
  const modal = page.getByRole('dialog', { name: 'Reminders' })
  const upcoming = modal.getByRole('region', { name: 'Coming up' })
  await expect(upcoming.getByRole('article', { name: 'GitHub' })).toBeVisible()
  await upcoming.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(modal.getByText('No reminders')).toBeVisible()
})

test('sets a weekly reminder from the editor', async ({ context, extensionId }) => {
  const page = await openBoard(context, extensionId)
  await page.getByRole('link', { name: 'Gmail' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Reminder' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reminder' })
  await dialog.getByRole('radio', { name: 'Repeating' }).click()
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
    const button = dialog.getByRole('button', { name: day, exact: true })
    if ((await button.getAttribute('aria-pressed')) === 'true') await button.click()
  }
  await expect(dialog.getByRole('status')).toHaveText('Pick at least one day')
  await expect(dialog.getByRole('button', { name: 'Set reminder' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Fri', exact: true }).click()
  await dialog.getByLabel('Time').fill('08:30')
  await expect(dialog.getByRole('status')).toContainText('08:30')
  await dialog.getByRole('button', { name: 'Set reminder' }).click()

  await page.getByRole('button', { name: 'Reminders' }).click()
  const card = page
    .getByRole('dialog', { name: 'Reminders' })
    .getByRole('article', { name: 'Gmail' })
  await expect(card).toContainText('Every Fri')
})

test('announces due reminders on the toolbar and marks them done', async ({
  context,
  extensionId,
}) => {
  const page = await openBoard(context, extensionId)
  await setReminderInOneHour(page, 'YouTube')
  const sw = await worker(context)
  const tabId = await sw.evaluate(
    async () => (await chrome.tabs.query({ url: 'chrome-extension://*/newtab.html' }))[0]!.id!,
  )

  // Make the reminder due now.
  await sw.evaluate(() =>
    tabcabin.db.reminders.toCollection().modify({ dueAt: Date.now() - 60_000 }),
  )
  await expect
    .poll(() => sw.evaluate((tabId) => chrome.action.getBadgeText({ tabId }), tabId))
    .toBe('1')
  await expect
    .poll(() => sw.evaluate(async () => (await tabcabin.db.reminders.toArray())[0]?.firedAt))
    .not.toBeNull()

  const bell = page.getByRole('button', { name: 'Reminders' })
  await expect(bell).toContainText('1')
  await bell.click()
  const due = page
    .getByRole('dialog', { name: 'Reminders' })
    .getByRole('region', { name: 'Due now' })
  const card = due.getByRole('article', { name: 'YouTube' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByText('Reminder done')).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: 'Reminders' }).getByText('No reminders'),
  ).toBeVisible()
  await expect
    .poll(() => sw.evaluate((tabId) => chrome.action.getBadgeText({ tabId }), tabId))
    .toBe('')
})

test('sets a reminder from the note toolbar', async ({ context, extensionId }) => {
  const page = await openBoard(context, extensionId)
  const group = page.getByRole('region', { name: 'To do' })
  await group.getByText(/^Press (Ctrl\+K|⌘K) to search everything$/).click()
  await expect(group.locator('textarea')).toBeFocused()
  await page.getByRole('button', { name: 'Reminder', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Reminder' })
  await dialog.getByRole('button', { name: 'Tomorrow' }).click()
  await dialog.getByRole('button', { name: 'Set reminder' }).click()
  await expect(group.getByRole('button', { name: /^Reminder: Tomorrow, 09:00/ })).toBeVisible()
})
