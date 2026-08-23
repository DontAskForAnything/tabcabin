import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

async function deleteLink(page: Page, name: string) {
  await page.getByRole('link', { name }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(page.getByRole('link', { name })).toHaveCount(0)
}

test('restores a deleted link from the bin', async ({ context, extensionId }) => {
  const page = await openBoard(context, extensionId)
  await deleteLink(page, 'Gmail')
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Bin' }).click()
  const bin = page.getByRole('dialog', { name: 'Bin' })
  const entry = bin.getByRole('listitem', { name: 'Gmail' })
  await expect(entry).toContainText('from 🌍 Quick links')
  await entry.getByRole('button', { name: 'Restore' }).click()
  await expect(bin.getByText('The bin is empty')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('region', { name: 'Quick links' }).getByRole('link', { name: 'Gmail' }),
  ).toBeVisible()
})

test('deletes forever and empties the bin', async ({ context, extensionId }) => {
  const page = await openBoard(context, extensionId)
  await deleteLink(page, 'GitHub')
  await deleteLink(page, 'YouTube')
  await page.keyboard.press('Control+Shift+Backspace')
  const bin = page.getByRole('dialog', { name: 'Bin' })
  await expect(bin.getByRole('listitem')).toHaveCount(2)
  await bin
    .getByRole('listitem', { name: 'YouTube' })
    .getByRole('button', { name: 'Delete forever' })
    .click()
  await expect(bin.getByRole('listitem')).toHaveCount(1)
  await bin.getByRole('button', { name: 'Empty bin' }).click()
  await page
    .getByRole('dialog', { name: 'Empty bin' })
    .getByRole('button', { name: 'Empty bin' })
    .click()
  await expect(bin.getByText('The bin is empty')).toBeVisible()
})
