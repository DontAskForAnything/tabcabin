import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

declare const chrome: typeof browser

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

test('finds a task and shows it on the board', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Recently added')).toBeVisible()
  await page.keyboard.type('collections view')
  await expect(dialog.getByRole('button', { name: /Try the Collections view/ })).toBeVisible()
  await expect(dialog.locator('mark').first()).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('[data-dnd-item].animate-\\[flash_1\\.8s_ease-out\\]')).toHaveCount(1)
})

test('searches all workspaces and switches to the right category', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('tab', { name: 'Read later' }).click()
  await page.keyboard.press('Control+k')
  await page.keyboard.type('gmail')
  await expect(page.getByRole('dialog').getByRole('button', { name: /Gmail/ })).toBeVisible()
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
})

test('switches to an open tab', async ({ context, extensionId }) => {
  const other = await context.newPage()
  await other.goto('data:text/html,<title>Quarterly report</title>')
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Open tabs' }).click()
  await page.keyboard.type('quarter')
  await expect(dialog.getByRole('button', { name: /Quarterly report/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect.poll(() => other.evaluate(() => document.visibilityState)).toBe('visible')
})

test('cycles scopes with Tab', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'All workspaces' })).toHaveClass(/bg-accent/)
  await page.keyboard.type('zzzzzz')
  await expect(dialog.getByText('Nothing found for “zzzzzz”')).toBeVisible()
})

test('opens a whole group from search', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+k')
  await page.keyboard.type('quick links')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Groups')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Quick links/ }).first()).toContainText(
    'Open all',
  )
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const [group] = await chrome.tabGroups.query({ title: 'Quick links' })
        return group ? (await chrome.tabs.query({ groupId: group.id })).length : 0
      }),
    )
    .toBe(4)
})

test('moves an open tab into a group with →', async ({ context, extensionId }) => {
  const other = await context.newPage()
  await other.goto('data:text/html,<title>Quarterly report</title>')
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Open tabs' }).click()
  await page.keyboard.type('quarter')
  await expect(dialog.getByRole('button', { name: /Quarterly report/ })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(dialog).toContainText('Move “Quarterly report” to')
  await page.keyboard.type('welc')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Moved to 👋 Welcome')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Welcome' }).getByRole('link', { name: /Quarterly report/ }),
  ).toBeVisible()
  await expect.poll(() => other.isClosed()).toBe(true)
})

test('moves a saved link and adds a note from search', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+k')
  await page.keyboard.type('gmail')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: /Gmail/ })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('option', { name: /To do/ }).click()
  await expect(
    page.getByRole('region', { name: 'To do' }).getByRole('link', { name: /Gmail/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    page.getByRole('region', { name: 'Quick links' }).getByRole('link', { name: /Gmail/ }),
  ).toBeVisible()

  await page.keyboard.press('Control+k')
  await page.keyboard.type('Call the plumber')
  await expect(dialog.getByRole('button', { name: /Add “Call the plumber”/ })).toBeVisible()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(dialog).toContainText('Add “Call the plumber” to')
  await expect(page.getByRole('option', { name: /Inbox/ })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog.getByRole('button', { name: /Add “Call the plumber”/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('region', { name: 'Inbox' }).getByText('Call the plumber'),
  ).toBeVisible()
})
