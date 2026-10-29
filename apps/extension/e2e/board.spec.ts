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
  // A finished to-do folds away below the group.
  await expect(group.getByText('Buy milk')).toBeHidden()
  await group.getByRole('button', { name: '1 done' }).click()
  await expect(group.getByText('Buy milk')).toBeVisible()
  await expect(group.getByRole('checkbox', { name: 'Mark as not done' })).toBeChecked()
})

test('turns a note into a to-do with /todo anywhere in it', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Welcome' })
  const todos = group.getByRole('checkbox', { name: 'Mark as done' })
  const before = await todos.count()
  await group.getByRole('button', { name: 'Note or link' }).click()
  const input = group.getByPlaceholder('Write a note or paste a link…')
  await input.fill('/todo Call the bank')
  await input.press('Enter')
  await input.fill('Book /todo the dentist')
  await input.press('Enter')
  await expect(group.getByText('Call the bank', { exact: true })).toBeVisible()
  await expect(group.getByText('Book the dentist', { exact: true })).toBeVisible()
  await expect(todos).toHaveCount(before + 2)
  // Typed in front of a note that is being edited.
  await input.press('Escape')
  await group.getByText('Groups hold links').click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('/todo ')
  await expect(todos).toHaveCount(before + 3)
  // The "/todo" the note already mentions stays.
  await expect(group.locator('textarea')).toHaveValue(/^Groups hold links.*\n.*\n• Type \/todo to/)
})

test('ticks off a to-do, folds it away and brings it back', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'To do' })
  const task = group.getByText('Press Ctrl+K to search everything')
  await group.getByRole('checkbox', { name: 'Mark as done' }).nth(1).click()
  // Crossed out first, then it flies into the finished ones.
  await expect(group.getByRole('button', { name: '2 done' })).toBeVisible()
  await expect(task).toBeHidden()
  await group.getByRole('button', { name: '2 done' }).click()
  await expect(task).toBeVisible()
  await group.getByRole('checkbox', { name: 'Mark as not done' }).last().click()
  await expect(group.getByRole('button', { name: '1 done' })).toBeVisible()
  await expect(group.getByRole('checkbox', { name: 'Mark as done' })).toHaveCount(3)

  await group.getByRole('button', { name: 'Delete done to-dos' }).click()
  await expect(group.getByRole('button', { name: '1 done' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(group.getByRole('button', { name: '1 done' })).toBeVisible()
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
  await expect(page.getByText('Nothing here yet')).toBeVisible()
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
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(group.getByText('Second note')).toBeVisible()
  await expect(group.getByText('• last line →')).toBeVisible()
})

test('writes a note on a link tile in the collections view', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('radio', { name: 'Collections' }).click()
  const section = page.getByRole('region', { name: 'Quick links' })
  await section.getByRole('link', { name: /GitHub/ }).hover()
  await section.getByRole('button', { name: 'Add a note' }).click()
  await section.getByRole('textbox', { name: 'Note' }).fill('Review the open pull requests /todo')
  await section.getByRole('textbox', { name: 'Note' }).press('Enter')
  await expect(section.getByText('Review the open pull requests')).toBeVisible()
  await section.getByRole('checkbox', { name: 'Mark as done' }).click()
  await expect(section.getByRole('checkbox', { name: 'Mark as not done' })).toBeChecked()
  // The same note shows on the board.
  await page.getByRole('radio', { name: 'Board' }).click()
  await expect(
    page.getByRole('region', { name: 'Quick links' }).getByText('Review the open pull requests'),
  ).toBeVisible()
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
  await expect(page.getByRole('button', { name: 'Open all', exact: true })).toHaveCount(0)
})
