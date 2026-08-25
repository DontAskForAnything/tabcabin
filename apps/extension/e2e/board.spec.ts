import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

test('shows the starter workspace', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await expect(page.getByRole('heading', { name: 'To do' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
})

test('creates a group with the keyboard and renames it', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.keyboard.press('g')
  const title = page.getByPlaceholder('Group name')
  await expect(title).toBeFocused()
  await title.fill('Reading list')
  await title.press('Enter')
  await expect(page.getByRole('heading', { name: 'Reading list' })).toBeVisible()
})

test('adds a note and turns it into a done task', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Welcome' })
  await group.getByRole('button', { name: 'Note or link' }).click()
  await group.getByPlaceholder('Write a note or paste a link…').fill('Buy milk /done')
  await group.getByPlaceholder('Write a note or paste a link…').press('Enter')
  await expect(group.getByText('Buy milk')).toBeVisible()
  await expect(group.getByRole('checkbox', { name: 'Mark as not done' })).toBeChecked()
})

test('adds a link from pasted text', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Welcome' })
  await group.getByRole('button', { name: 'Note or link' }).click()
  await group.getByPlaceholder('Write a note or paste a link…').fill('wxt.dev')
  await group.getByPlaceholder('Write a note or paste a link…').press('Enter')
  await expect(group.getByRole('link', { name: /wxt\.dev/ })).toBeVisible()
})

test('deletes a group and restores it with undo', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Welcome' })
  await group.getByRole('button', { name: 'Group options' }).click()
  await page.getByRole('menuitem', { name: 'Delete group' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
})

test('adds a category and switches with number keys', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('button', { name: 'New category' }).click()
  const input = page.locator('input[size]')
  await input.fill('Ideas')
  await input.press('Enter')
  await expect(page.getByRole('tab', { name: 'Ideas' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('This category is empty')).toBeVisible()
  await page.keyboard.press('1')
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
})

test('edits a note inline with Enter+Enter and the toolbar', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Welcome' })
  await group.getByText('Groups hold links').click()
  const editor = group.locator('textarea')
  await expect(editor).toBeFocused()
  await editor.press('End')
  await page.keyboard.press('Control+End')
  await page.keyboard.type('\n- last line ->')
  await expect(editor).toHaveValue(/• last line →$/)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  const next = group.locator('textarea')
  await expect(next).toHaveValue('')
  await page.keyboard.type('Second note')
  await page.getByRole('button', { name: 'Color' }).click()
  await page.getByRole('button', { name: 'Green' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(group.getByText('Second note')).toBeVisible()
  await expect(group.getByText('• last line →')).toBeVisible()
})

test('switches the category to the collections view and back', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('radio', { name: 'Collections' }).click()
  const section = page.getByRole('region', { name: 'Quick links' })
  await expect(section.getByRole('button', { name: 'Open all' })).toBeVisible()
  await expect(section.getByRole('link', { name: /GitHub/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Collections' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByRole('radio', { name: 'Board' }).click()
  await expect(page.getByRole('button', { name: 'Open all' })).toHaveCount(0)
})
