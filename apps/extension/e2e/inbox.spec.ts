import { type BrowserContext, type Locator, type Page, type Worker } from '@playwright/test'
import { expect, test } from './fixtures'

declare const chrome: typeof browser
declare const tabcabin: {
  handleMenuClick: (info: object, tab: object) => Promise<void>
  togglePopover: (tab: object) => Promise<void>
  saveTabToInbox: (tab: object) => Promise<void>
}

/** A page at https://site.test/<name> titled `title`. */
async function servePage(context: BrowserContext, name: string, title: string) {
  await context.route('https://site.test/**', (route) => {
    const path = new URL(route.request().url()).pathname.slice(1)
    const heading = path === name ? title : path
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><title>${heading}</title><h1>${heading}</h1>`,
    })
  })
  const page = await context.newPage()
  await page.goto(`https://site.test/${name}`)
  return page
}

async function worker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
}

async function tabFor(sw: Worker, url: string) {
  return sw.evaluate(async (target) => (await chrome.tabs.query({ url: target }))[0]!, url)
}

async function openBoard(context: BrowserContext, extensionId: string): Promise<Page> {
  const board = await context.newPage()
  await board.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(board.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return board
}

async function drag(page: Page, from: Locator, to: Locator) {
  const start = (await from.boundingBox())!
  const end = (await to.boundingBox())!
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2 + 10, start.y + start.height / 2 + 10, {
    steps: 4,
  })
  await page.mouse.move(end.x + end.width / 2, end.y + 3, { steps: 18 })
  await page.waitForTimeout(60)
  await page.mouse.up()
}

test('saves a page to the Inbox with its shortcut and sorts it on the board', async ({
  context,
  extensionId,
}) => {
  const board = await openBoard(context, extensionId)
  await expect(board.getByRole('region', { name: 'Inbox' })).toHaveCount(0)
  const page = await servePage(context, 'cron', 'Cron syntax')
  const sw = await worker(context)
  await sw.evaluate(
    (tab) => tabcabin.saveTabToInbox(tab),
    await tabFor(sw, 'https://site.test/cron'),
  )
  await expect(page.getByText('Saved to 📬 Inbox')).toBeVisible()

  const inbox = board.getByRole('region', { name: 'Inbox' })
  await expect(inbox.getByRole('link', { name: /Cron syntax/ })).toBeVisible()
  await expect(inbox).toContainText('1 to sort')

  const quickLinks = board.getByRole('region', { name: 'Quick links' })
  await drag(
    board,
    inbox.getByRole('link', { name: /Cron syntax/ }),
    quickLinks.getByRole('link', { name: /GitHub/ }),
  )
  await expect(quickLinks.getByRole('link', { name: /Cron syntax/ })).toBeVisible()
  await expect(inbox).toHaveCount(0)
})

test('the right-click menu and the popover save to the Inbox too', async ({
  context,
  extensionId,
}) => {
  const board = await openBoard(context, extensionId)
  const page = await servePage(context, 'menu', 'Saved from the menu')
  const sw = await worker(context)
  await sw.evaluate(
    (tab) => tabcabin.handleMenuClick({ menuItemId: 'save|g|inbox' }, tab),
    await tabFor(sw, 'https://site.test/menu'),
  )
  await expect(page.getByText('Saved to 📬 Inbox')).toBeVisible()

  const second = await context.newPage()
  await second.goto('https://site.test/popover')
  await sw.evaluate(
    (tab) => tabcabin.togglePopover(tab),
    await tabFor(sw, 'https://site.test/popover'),
  )
  const popover = second.getByRole('dialog', { name: 'TabCabin' })
  await popover.getByRole('button', { name: /Quick links/ }).click()
  await popover.getByRole('button', { name: /Inbox/ }).click()
  await expect(popover.getByRole('button', { name: /📬 Inbox/ })).toBeVisible()
  await popover.getByRole('button', { name: 'Save' }).click()
  await expect(popover.getByText(/Saved to/)).toBeVisible()

  const inbox = board.getByRole('region', { name: 'Inbox' })
  await expect(inbox).toContainText('2 to sort')
  await inbox.getByRole('link', { name: /Saved from the menu/ }).click({ button: 'right' })
  await board.getByRole('menuitem', { name: 'Move to group' }).click()
  await board.getByRole('menuitem', { name: 'To do' }).click()
  await expect(
    board.getByRole('region', { name: 'To do' }).getByRole('link', { name: /Saved from the menu/ }),
  ).toBeVisible()
  await expect(inbox).toContainText('1 to sort')

  await board.keyboard.press('Control+k')
  await board.keyboard.type('popover')
  const result = board.getByRole('dialog').getByRole('button', { name: /popover/ })
  await expect(result).toContainText('📬 Inbox')
  await board.keyboard.press('Control+Enter')
  await expect(board.getByRole('dialog')).toHaveCount(0)
  await expect(inbox.locator('[data-dnd-item].animate-\\[flash_1\\.8s_ease-out\\]')).toHaveCount(1)
})
