import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

test('tags a link from its right-click menu and several picked ones at once', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const links = page.getByRole('region', { name: 'Quick links' })
  const github = links.getByRole('link', { name: /GitHub/ })
  const gmail = links.getByRole('link', { name: /Gmail/ })

  await github.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Tags' }).click()
  await page.getByRole('menuitem', { name: 'New tag…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tags' })
  await dialog.getByLabel('Add a tag…').fill('#Work')
  await dialog.getByLabel('Add a tag…').press('Enter')
  await expect(dialog.getByText('1 of 25 tags used')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(github.getByText('Work')).toBeVisible()

  // Both picked links get the tag from the menu; GitHub had it already.
  await github.click({ modifiers: ['Shift'] })
  await gmail.click({ modifiers: ['Shift'] })
  await gmail.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Tags' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Work' }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(gmail.getByText('Work')).toBeVisible()
  await expect(github.getByText('Work')).toBeVisible()

  // Taken off in the tags window with its ×.
  await gmail.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Tags' }).click()
  await page.getByRole('menuitem', { name: 'New tag…' }).click()
  await page.getByRole('button', { name: 'Remove Work' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(gmail.getByText('Work')).toHaveCount(0)
})
