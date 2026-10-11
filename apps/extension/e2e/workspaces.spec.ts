import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

/** Creates a workspace from the workspaces dialog; the board then switches to it. */
async function createWorkspace(page: Page, name: string) {
  await page.keyboard.press('Control+o')
  await page.getByRole('dialog').getByRole('button', { name: 'New workspace' }).click()
  const dialog = page.getByRole('dialog', { name: 'New workspace' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(name)
}

async function switchTo(page: Page, name: string) {
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name }).click()
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(name)
}

test('creates a workspace and switches with the keyboard', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await createWorkspace(page, 'Side project')
  await expect(page.getByText('Nothing here yet')).toBeVisible()
  await page.keyboard.press('Control+o')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText('Personal')
})

test('asks for the name and the icon of a new workspace', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name: 'New workspace' }).click()
  const dialog = page.getByRole('dialog', { name: 'New workspace' })
  await expect(dialog.getByLabel('Name')).toBeFocused()
  await dialog.getByRole('button', { name: 'Change emoji' }).click()
  await page.getByPlaceholder('Search emoji').fill('evergreen')
  await page.locator('[frimousse-emoji]', { hasText: '🌲' }).click()
  await expect(dialog.getByRole('button', { name: 'Change emoji' })).toHaveText('🌲')
  await dialog.getByLabel('Name').fill('Garden')
  await dialog.getByLabel('Name').press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText('🌲Garden')
  await expect(page.getByText('Nothing here yet')).toBeVisible()
})

test('cancels a new workspace without creating it', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name: 'New workspace' }).click()
  const dialog = page.getByRole('dialog', { name: 'New workspace' })
  await dialog.getByLabel('Name').fill('Never mind')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await expect(page.getByRole('menuitem', { name: 'Never mind' })).toHaveCount(0)
})

test('filters workspaces and categories', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('Control+o')
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Find a workspace or category').fill('read')
  await expect(dialog.getByRole('button', { name: /Read later/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Projects/ })).toHaveCount(0)
  await page.keyboard.press('Enter')
})

test('moves a group to another workspace', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await createWorkspace(page, 'Archive')
  await switchTo(page, 'Personal')
  await page
    .getByRole('region', { name: 'Quick links' })
    .getByRole('button', { name: 'Group options' })
    .click()
  await page.getByRole('menuitem', { name: 'Move to' }).click()
  await page.getByRole('menuitem', { name: 'Archive' }).click()
  await page.getByRole('menuitem', { name: 'Untitled' }).click()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name: 'Archive' }).click()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
})

test('deletes a workspace and brings it back with undo', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await createWorkspace(page, 'Temporary')
  await switchTo(page, 'Personal')
  await page.keyboard.press('Control+o')
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('region', { name: 'Temporary' })
    .getByRole('button', { name: 'More' })
    .click()
  await page.getByRole('menuitem', { name: 'Delete workspace' }).click()
  await page
    .getByRole('dialog', { name: 'Delete workspace' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await expect(dialog.getByRole('heading', { name: 'Temporary' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(dialog.getByRole('heading', { name: 'Temporary' })).toBeVisible()
})
