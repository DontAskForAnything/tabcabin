import { expect, test } from './fixtures'

test.use({ welcome: true })

test('welcomes a first start and can start with an empty board', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const welcome = page.getByRole('dialog', { name: 'Welcome to TabCabin' })
  await expect(welcome).toContainText('A calm cabin for your tabs.')
  await expect(welcome.getByRole('button', { name: 'Get started' })).toBeFocused()
  await page.keyboard.press('Enter')

  const start = page.getByRole('dialog', { name: 'How would you like to start?' })
  await expect(start.getByRole('button', { name: /Starter board/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await start.getByRole('button', { name: /Empty board/ }).click()
  await start.getByRole('button', { name: 'Continue' }).click()

  const tips = page.getByRole('dialog', { name: 'Good to know' })
  await expect(tips).toContainText('Ctrl+K')
  await tips.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Main' })).toBeVisible()
  await expect(page.getByText('Nothing here yet')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('tab', { name: 'Main' })).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('starts with a template', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.getByRole('button', { name: 'Get started' }).click()
  const start = page.getByRole('dialog', { name: 'How would you like to start?' })
  await start.getByRole('button', { name: /Work/ }).click()
  await start.getByRole('button', { name: 'Continue' }).click()
  await page
    .getByRole('dialog', { name: 'Good to know' })
    .getByRole('button', { name: 'Done', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toHaveText('💼Work')
  for (const title of ['Projects', 'Meetings', 'Read later'])
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toHaveCount(0)
})

test('closing the welcome keeps the starter board, and search can open on top', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const welcome = page.getByRole('dialog', { name: 'Welcome to TabCabin' })
  await expect(welcome).toBeVisible()

  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(welcome).toBeVisible()

  await welcome.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()

  const other = await context.newPage()
  await other.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(other.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await other.waitForTimeout(500)
  await expect(other.getByRole('dialog')).toHaveCount(0)
})

test('moves in from another tab manager instead of the starter board', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.getByRole('button', { name: 'Get started' }).click()
  const start = page.getByRole('dialog', { name: 'How would you like to start?' })
  await start.getByLabel('Import a file').setInputFiles({
    name: 'onetab.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'https://example.com/one | One\nhttps://example.com/two | Two\n\nhttps://example.org/ | Three\n',
    ),
  })

  const tips = page.getByRole('dialog', { name: 'Good to know' })
  await expect(tips).toBeVisible()
  await tips.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(
    'Imported from OneTab',
  )
  await expect(page.getByRole('link', { name: /Three/ })).toBeVisible()

  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await expect(page.getByRole('menuitem', { name: /Personal/ })).toHaveCount(0)
})
