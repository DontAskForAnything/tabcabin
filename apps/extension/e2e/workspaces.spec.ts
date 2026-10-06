import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

async function createWorkspace(page: Page, name: string) {
  await page.keyboard.press('Control+o')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'New workspace' }).click()
  const input = dialog.getByRole('textbox', { name: 'Rename workspace' })
  await input.fill(name)
  await input.press('Enter')
  await expect(dialog.getByRole('heading', { name })).toBeVisible()
  return dialog
}

test('creates a workspace and switches with the keyboard', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const dialog = await createWorkspace(page, 'Side project')
  await dialog.getByPlaceholder('Find a workspace or category').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText('Side project')
  await expect(page.getByText('Nothing here yet')).toBeVisible()
  await page.keyboard.press('Control+o')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText('Personal')
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
  await page.keyboard.press('Escape')
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
  const dialog = await createWorkspace(page, 'Temporary')
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
