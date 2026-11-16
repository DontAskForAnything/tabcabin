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

test('changes the tags of a link in its editor, saved only with Save', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const github = page
    .getByRole('region', { name: 'Quick links' })
    .getByRole('link', { name: /GitHub/ })
  const edit = async () => {
    await github.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Edit' }).click()
    return page.getByRole('dialog', { name: 'Edit link' })
  }
  let dialog = await edit()
  const field = dialog.getByRole('textbox', { name: 'Add a tag…' })
  await field.fill('code')
  await field.press('Enter')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(github.getByText('code')).toHaveCount(0)

  dialog = await edit()
  await dialog.getByRole('textbox', { name: 'Add a tag…' }).fill('code')
  await dialog.getByRole('textbox', { name: 'Add a tag…' }).press('Enter')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(github.getByText('code')).toBeVisible()

  dialog = await edit()
  await dialog.getByRole('button', { name: 'Remove code' }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(github.getByText('code')).toHaveCount(0)
})

test('filters the board by tags from the button next to Search', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  // No tags yet: no filter button.
  await expect(page.getByRole('button', { name: 'Filter by tag' })).toHaveCount(0)
  const links = page.getByRole('region', { name: 'Quick links' })
  const tag = async (name: RegExp, tagName: string) => {
    await links.getByRole('link', { name }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Tags' }).click()
    await page.getByRole('menuitem', { name: 'New tag…' }).click()
    await page.getByRole('textbox', { name: 'Add a tag…' }).fill(tagName)
    await page.getByRole('textbox', { name: 'Add a tag…' }).press('Enter')
    await page.getByRole('button', { name: 'Done' }).click()
  }
  await tag(/GitHub/, 'work')
  await tag(/YouTube/, 'later')

  await page.getByRole('button', { name: 'Filter by tag' }).click()
  await page.getByRole('checkbox', { name: 'work' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Filter by tag, 1 on' })).toBeVisible()
  await expect(links.getByRole('link', { name: /GitHub/ })).toBeVisible()
  await expect(links.getByRole('link', { name: /Gmail/ })).toHaveCount(0)
  await expect(links.getByRole('link', { name: /YouTube/ })).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'To do' }).getByText('Nothing tagged here'),
  ).toBeVisible()
  // The filter stays when another category opens and back.
  await page.getByRole('tab', { name: 'Read later' }).click()
  await page.getByRole('tab', { name: 'Today' }).click()
  await expect(links.getByRole('link', { name: /Gmail/ })).toHaveCount(0)

  // A second tag shows its items too; × on the bar takes one off, Escape the rest.
  await page.getByRole('button', { name: 'Filter by tag, 1 on' }).click()
  await page.getByRole('checkbox', { name: 'later' }).click()
  await page.keyboard.press('Escape')
  await expect(links.getByRole('link', { name: /YouTube/ })).toBeVisible()
  await page.getByRole('button', { name: 'Remove work' }).click()
  await expect(links.getByRole('link', { name: /GitHub/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(links.getByRole('link', { name: /Gmail/ })).toBeVisible()
  await expect(page.getByText('Showing')).toHaveCount(0)
})

test('finds tagged items with # in search', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const links = page.getByRole('region', { name: 'Quick links' })
  await links.getByRole('link', { name: /YouTube/ }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Tags' }).click()
  await page.getByRole('menuitem', { name: 'New tag…' }).click()
  await page.getByRole('textbox', { name: 'Add a tag…' }).fill('Videos')
  await page.getByRole('textbox', { name: 'Add a tag…' }).press('Enter')
  await page.getByRole('button', { name: 'Done' }).click()

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Recently added')).toBeVisible()
  await page.keyboard.type('#vid')
  await expect(dialog.getByRole('button', { name: /YouTube/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Gmail|GitHub/ })).toHaveCount(0)
  await page.keyboard.type(' gmail')
  await expect(dialog.getByRole('button', { name: /YouTube/ })).toHaveCount(0)
})
