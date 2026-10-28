import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

/**
 * Drags `from` to a point, moving in small steps like a real pointer. Before releasing it pauses
 * briefly, as a hand does, so the drop target has caught up with the last move.
 */
async function drag(
  page: Page,
  from: Locator,
  to: { x: number; y: number },
  holdMs = 0,
  beforeRelease?: () => Promise<void>,
) {
  const start = await center(from)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 18 })
  if (holdMs) {
    await page.waitForTimeout(holdMs)
    await page.mouse.move(to.x + 1, to.y, { steps: 1 })
  }
  await page.waitForTimeout(60)
  await beforeRelease?.()
  await page.mouse.up()
}

const titlesIn = (page: Page, group: string) =>
  page
    .getByRole('region', { name: group })
    .locator('[data-dnd-item] a span.font-\\[550\\]')
    .allTextContents()

test('reorders links inside a group', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Quick links' })
  const youtube = await center(group.getByRole('link', { name: /YouTube/ }))
  await drag(page, group.getByRole('link', { name: /GitHub/ }), {
    x: youtube.x,
    y: youtube.box.y + youtube.box.height - 4,
  })
  await expect
    .poll(() => titlesIn(page, 'Quick links'))
    .toEqual(['Gmail', 'Google Calendar', 'YouTube', 'GitHub'])
})

test('moves a link to another group', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const note = await center(
    page.getByRole('region', { name: 'Welcome' }).getByText('Groups hold links'),
  )
  await drag(page, page.getByRole('link', { name: /Gmail/ }), { x: note.x, y: note.box.y + 3 })
  await expect(
    page.getByRole('region', { name: 'Welcome' }).getByRole('link', { name: /Gmail/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Quick links' }).getByRole('link', { name: /Gmail/ }),
  ).toHaveCount(0)
})

test('stacks two links by holding one over the other', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const gmail = await center(page.getByRole('link', { name: /Gmail/ }))
  await drag(page, page.getByRole('link', { name: /GitHub/ }), { x: gmail.x, y: gmail.y }, 700)
  await expect(page.getByRole('button', { name: 'Show links' })).toBeVisible()
  await expect(page.getByText('Links stacked')).toBeVisible()
})

test('pins a to-do to a link by holding it over the link', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const github = await center(page.getByRole('link', { name: /GitHub/ }))
  await drag(
    page,
    page.getByRole('region', { name: 'To do' }).getByText('Try the Collections view'),
    { x: github.x, y: github.y },
    700,
  )
  await expect(page.getByText('Note pinned to the link')).toBeVisible()
  const links = page.getByRole('region', { name: 'Quick links' })
  await expect(links.getByText('Try the Collections view')).toBeVisible()
  await links.getByRole('checkbox', { name: 'Mark as done' }).click()
  await expect(links.getByRole('checkbox', { name: 'Mark as not done' })).toBeChecked()
  await expect(
    page.getByRole('region', { name: 'To do' }).getByText('Try the Collections view'),
  ).toHaveCount(0)
})

test('reorders groups by dragging the header', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const quick = await center(page.getByRole('region', { name: 'Quick links' }))
  const header = page.getByRole('region', { name: 'Welcome' }).locator('header')
  await drag(page, header.getByRole('heading', { name: 'Welcome' }), {
    x: quick.box.x + 20,
    y: quick.y,
  })
  await expect
    .poll(() => page.locator('[data-dnd-group] h2').allTextContents())
    .toEqual(['Welcome', 'Quick links', 'To do'])
})

test('deletes an item by dropping it on the trash zone', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const link = page.getByRole('link', { name: /YouTube/ })
  const start = await center(link)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 20, start.y + 20, { steps: 4 })
  const trash = page.getByText('Drop here to delete')
  await expect(trash).toBeVisible()
  await page.waitForTimeout(300)
  const target = await center(trash)
  await page.mouse.move(target.x, target.y, { steps: 15 })
  await page.mouse.up()
  await expect(page.getByRole('link', { name: /YouTube/ })).toHaveCount(0)
  await expect(page.getByText('Item deleted')).toBeVisible()
})

test('saves an open tab by dragging it from the panel', async ({ context, extensionId }) => {
  const other = await context.newPage()
  await other.goto('data:text/html,<title>Draggable page</title><h1>hi</h1>')
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const row = page.getByRole('navigation', { name: 'Open tabs' }).getByText('Draggable page')
  await expect(row).toBeVisible()
  const target = await center(
    page.getByRole('region', { name: 'To do' }).getByRole('button', { name: 'Note or link' }),
  )
  await drag(page, row, { x: target.x, y: target.box.y - 12 })
  await expect(
    page.getByRole('region', { name: 'To do' }).getByRole('link', { name: /Draggable page/ }),
  ).toBeVisible()
  await expect.poll(() => other.isClosed()).toBe(true)
})

test('creates a group by dropping on the new group column', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  // Wide enough to show the first group and the new group column together (aiming off-screen
  // would start auto-scrolling the board under the pointer).
  await page.setViewportSize({ width: 1800, height: 900 })
  const newGroup = page.getByRole('button', { name: /New group/ }).last()
  await expect(newGroup).toBeInViewport({ ratio: 1 })
  const column = await center(newGroup)
  // Let go once the column shows it will take the link.
  await drag(
    page,
    page.getByRole('link', { name: /YouTube/ }),
    { x: column.x, y: column.y },
    0,
    () => expect(newGroup).toHaveClass(/border-success/),
  )
  await expect(page.getByPlaceholder('Group name')).toBeFocused()
  await page.getByPlaceholder('Group name').fill('Videos')
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('region', { name: 'Videos' }).getByRole('link', { name: /YouTube/ }),
  ).toBeVisible()
})

test('moves a link to another category by dropping it on the tab', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const tab = await center(page.getByRole('tab', { name: 'Read later' }))
  await drag(page, page.getByRole('link', { name: /Gmail/ }), { x: tab.x, y: tab.y }, 800)
  await expect(page.getByRole('tab', { name: 'Read later' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    page.getByRole('region', { name: 'Articles' }).getByRole('link', { name: /Gmail/ }),
  ).toBeVisible()
})

test('moves a link with the context menu', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('link', { name: /GitHub/ }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Move to group' }).click()
  await page.getByRole('menuitem', { name: 'Welcome' }).click()
  await expect(
    page.getByRole('region', { name: 'Welcome' }).getByRole('link', { name: /GitHub/ }),
  ).toBeVisible()
})
