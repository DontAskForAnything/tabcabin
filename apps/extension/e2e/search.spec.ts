import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

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
