import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openSettings(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  return page
}

test('changes appearance settings live', async ({ context, extensionId }) => {
  const page = await openSettings(context, extensionId)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('tab', { name: 'Appearance' }).click()
  await dialog.getByRole('switch', { name: 'Show addresses under links' }).click()
  await dialog.getByRole('radio', { name: 'Compact' }).click()
  await dialog.getByRole('radio', { name: 'Dark' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('github.com')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('keeps the title and the close button in view while a tab scrolls', async ({
  context,
  extensionId,
}) => {
  const page = await openSettings(context, extensionId)
  await page.setViewportSize({ width: 1280, height: 600 })
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('tab', { name: 'Data' }).click()
  await dialog.getByRole('button', { name: 'Delete everything' }).scrollIntoViewIfNeeded()
  await expect(dialog.getByText('Export', { exact: true })).not.toBeInViewport()
  await expect(dialog.getByRole('heading', { name: 'Data' })).toBeInViewport({ ratio: 1 })
  // The dialog also has a hidden close button for screen readers; the visible one comes last.
  const close = dialog.getByRole('button', { name: 'Close' }).last()
  await expect(close).toBeInViewport({ ratio: 1 })
  await close.click()
  await expect(dialog).toHaveCount(0)
})

test('switches the language to Polish', async ({ context, extensionId }) => {
  const page = await openSettings(context, extensionId)
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('radio', { name: 'Polski' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Ustawienia' })
  await expect(dialog.getByRole('tab', { name: 'Wygląd' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Przypomnienia' })).toBeVisible()
})

test('rebinds a shortcut and rejects one that is taken', async ({ context, extensionId }) => {
  const page = await openSettings(context, extensionId)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('tab', { name: 'Shortcuts' }).click()
  const newGroup = dialog.getByRole('button', { name: /^New group:/ })
  await newGroup.click()
  await expect(newGroup).toHaveText('Press keys…')
  await page.keyboard.press('Control+k')
  await expect(dialog.getByText('Already used for “Search”')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await newGroup.click()
  await page.keyboard.press('n')
  await expect(newGroup).toHaveAccessibleName('New group: N')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.keyboard.press('n')
  await expect(page.getByPlaceholder('Group name')).toBeFocused()
})

test('deletes all data and starts fresh', async ({ context, extensionId }) => {
  const page = await openSettings(context, extensionId)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('tab', { name: 'Data' }).click()
  await expect(dialog.getByText(/Workspaces: 1 · groups: 4/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete everything' }).click()
  await page
    .getByRole('dialog', { name: 'Delete all data' })
    .getByRole('button', { name: 'Delete everything' })
    .click()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
