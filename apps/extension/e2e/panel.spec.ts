import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** The extension page exposes the raw `chrome` API inside `page.evaluate`. */
declare const chrome: typeof browser

async function openBoard(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
}

async function openPages(context: BrowserContext, titles: string[]) {
  const pages = []
  for (const title of titles) {
    const p = await context.newPage()
    await p.goto(`data:text/html,<title>${title}</title><p>${title}</p>`)
    pages.push(p)
  }
  return pages
}

const panel = (page: Page) => page.getByRole('navigation', { name: 'Open tabs' })

test('shows native tab groups as folders', async ({ context, extensionId }) => {
  await openPages(context, ['Paper one', 'Paper two', 'Loose page'])
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.evaluate(async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    const ids = tabs.filter((t) => t.title?.startsWith('Paper')).map((t) => t.id!)
    const groupId = await chrome.tabs.group({ tabIds: ids as [number, ...number[]] })
    await chrome.tabGroups.update(groupId, { title: 'Research', color: 'blue' })
  })
  await expect(panel(page).getByText('Research')).toBeVisible()
  await expect(panel(page).getByRole('button', { name: 'Paper one' })).toBeVisible()
  await panel(page).getByText('Research').click()
  await expect(panel(page).getByRole('button', { name: 'Paper one' })).toHaveCount(0)
  await expect(panel(page).getByRole('button', { name: 'Loose page' })).toBeVisible()
})

test('saves selected tabs into a new group and closes them', async ({ context, extensionId }) => {
  const [first, second] = await openPages(context, ['Alpha page', 'Beta page', 'Gamma page'])
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await panel(page)
    .getByRole('button', { name: 'Alpha page' })
    .click({ modifiers: ['Shift'] })
  await panel(page)
    .getByRole('button', { name: 'Beta page' })
    .click({ modifiers: ['Shift'] })
  await expect(panel(page).getByText('2 tabs selected')).toBeVisible()
  await panel(page)
    .getByRole('button', { name: /Save tabs|Save all tabs/ })
    .click()
  await page.getByRole('menuitem', { name: 'Save all into a new group' }).click()
  const group = page.getByRole('region', { name: /Tabs from/ })
  await expect(group.getByRole('link', { name: /Alpha page/ })).toBeVisible()
  await expect(group.getByRole('link', { name: /Beta page/ })).toBeVisible()
  await expect(group.getByRole('link', { name: /Gamma page/ })).toHaveCount(0)
  await expect.poll(() => first!.isClosed() && second!.isClosed()).toBe(true)
})

test('keeps the save menu of a tab next to its button', async ({ context, extensionId }) => {
  await openPages(context, ['Alpha page'])
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const row = panel(page).getByRole('button', { name: 'Alpha page' })
  await row.hover()
  await row.getByRole('button', { name: 'Save' }).click()
  // An open menu hides the rest of the page from roles, so find the button by its text.
  const save = page.locator('[aria-label="Alpha page"] button', { hasText: 'Save' })
  const item = page.getByRole('menuitem', { name: 'New group' })
  await item.hover()
  // The pointer left the row, yet the button and its menu stay where they were.
  await expect(save).toBeVisible()
  const button = (await save.boundingBox())!
  const menu = (await page.getByRole('menu').boundingBox())!
  expect(Math.abs(menu.y - (button.y + button.height))).toBeLessThan(40)
  await item.click()
  await expect(page.getByRole('link', { name: /Alpha page/ })).toBeVisible()
})

test('closes duplicate tabs', async ({ context, extensionId }) => {
  await openPages(context, ['Same page', 'Same page', 'Other page'])
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await expect(panel(page).getByRole('button', { name: 'Same page' })).toHaveCount(2)
  await panel(page).getByRole('button', { name: 'Save all tabs' }).click()
  await page.getByRole('menuitem', { name: 'Close duplicate tabs' }).click()
  await expect(page.getByText('Closed 1 duplicate tab')).toBeVisible()
  await expect(panel(page).getByRole('button', { name: 'Same page' })).toHaveCount(1)
})

test('collapses the panel to icons and peeks on hover', async ({ context, extensionId }) => {
  await openPages(context, ['Peek page'])
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('button', { name: 'Collapse to icons' }).click()
  const rail = panel(page).first()
  await expect(rail).toHaveCSS('width', '76px')
  await rail.hover()
  await expect(page.getByRole('button', { name: 'Keep panel open' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep panel open' }).click()
  await expect(page.getByRole('button', { name: 'Collapse to icons' })).toBeVisible()
})

test('shows the open tabs right away when the panel opens', async ({ context, extensionId }) => {
  await openPages(context, ['Steady page'])
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('button', { name: 'Collapse to icons' }).click()
  await expect(panel(page).first()).toHaveCSS('width', '76px')
  await page.evaluate(() => {
    const flags = window as unknown as { emptyPanel: boolean }
    flags.emptyPanel = false
    new MutationObserver(() => {
      if (/· 0 tabs|No other tabs here/.test(document.body.innerText)) flags.emptyPanel = true
    }).observe(document.body, { childList: true, subtree: true, characterData: true })
  })
  await panel(page).first().hover()
  await page.getByRole('button', { name: 'Keep panel open' }).click()
  await expect(panel(page).getByRole('button', { name: 'Steady page' })).toBeVisible()
  const flags = await page.evaluate(() => (window as unknown as { emptyPanel: boolean }).emptyPanel)
  expect(flags).toBe(false)
})

test('saves a whole window as one group, closes it and brings it back with undo', async ({
  context,
  extensionId,
}) => {
  await context.route('https://window.test/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<title>${new URL(route.request().url()).pathname.slice(1)}</title>`,
    }),
  )
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const windows = () => page.evaluate(async () => (await chrome.windows.getAll()).length)
  await page.evaluate(() =>
    chrome.windows.create({ url: ['https://window.test/North', 'https://window.test/South'] }),
  )
  await expect.poll(windows).toBe(2)

  await panel(page)
    .getByRole('button', { name: /This window/ })
    .click()
  await page.getByRole('menuitem', { name: /Window \d · 2 tabs/ }).click()
  await panel(page).getByRole('button', { name: 'Save all tabs' }).click()
  await page.getByRole('menuitem', { name: 'Save as one group and close' }).click()

  const group = page.getByRole('region', { name: /^Window from / })
  await expect(group.getByRole('link', { name: /North/ })).toBeVisible()
  await expect(group.getByRole('link', { name: /South/ })).toBeVisible()
  await expect.poll(windows).toBe(1)

  await page.getByText('Saved 2 tabs and closed the window').waitFor()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(windows).toBe(2)
  await expect(group).toHaveCount(0)
})

test('opens a saved group as a window in one click', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  const group = page.getByRole('region', { name: 'Quick links' })
  await group.hover()
  await group.getByRole('button', { name: 'Open all in new window' }).click()
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await chrome.windows.getAll({ populate: true })).map((w) => w.tabs?.length ?? 0),
      ),
    )
    .toContainEqual(4)
})

test('opens a saved group as a tab group in this window when set', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await openBoard(page, extensionId)
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'This window' }).click()
  await page.keyboard.press('Escape')
  const group = page.getByRole('region', { name: 'Quick links' })
  await group.hover()
  await group.getByRole('button', { name: 'Open all as tab group' }).click()
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const [group] = await chrome.tabGroups.query({})
        const windows = await chrome.windows.getAll()
        const tabs = group ? await chrome.tabs.query({ groupId: group.id }) : []
        return { windows: windows.length, title: group?.title, tabs: tabs.length }
      }),
    )
    .toEqual({ windows: 1, title: 'Quick links', tabs: 4 })
})
