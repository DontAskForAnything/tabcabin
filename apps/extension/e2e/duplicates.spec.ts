import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

async function drag(page: Page, from: Locator, to: Locator) {
  const start = (await from.boundingBox())!
  const end = (await to.boundingBox())!
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2 + 10, start.y + start.height / 2 + 10, {
    steps: 4,
  })
  await page.mouse.move(end.x + end.width / 2, end.y - 12, { steps: 18 })
  await page.waitForTimeout(60)
  await page.mouse.up()
}

const flashing = '[data-dnd-item].animate-\\[flash_1\\.8s_ease-out\\]'

test('says where a tab dropped on the board is already saved', async ({ context, extensionId }) => {
  await context.route('https://github.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>GitHub home</title>' }),
  )
  const other = await context.newPage()
  await other.goto('https://github.com/')
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const row = page.getByRole('navigation', { name: 'Open tabs' }).getByText('GitHub home')
  await drag(
    page,
    row,
    page.getByRole('region', { name: 'To do' }).getByRole('button', { name: 'Note or link' }),
  )
  await expect(page.getByText('Already saved in 🌍 Quick links')).toBeVisible()
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page.getByRole('region', { name: 'Quick links' }).locator(flashing)).toHaveCount(1)
})

test('warns about a link added by hand, unless that is turned off', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const todo = page.getByRole('region', { name: 'To do' })
  await todo.getByRole('button', { name: 'Note or link' }).click()
  await page.keyboard.type('github.com')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Already saved in 🌍 Quick links')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByText('Already saved in')).toHaveCount(0)

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('switch', { name: 'Say when a link is already saved' })
    .click()
  await page.keyboard.press('Escape')
  await todo.getByRole('button', { name: 'Note or link' }).click()
  await page.keyboard.type('mail.google.com')
  await page.keyboard.press('Enter')
  await expect(todo.getByRole('link', { name: /mail\.google\.com/ })).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.getByText('Already saved in')).toHaveCount(0)
})
