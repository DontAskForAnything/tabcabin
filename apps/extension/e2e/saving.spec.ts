import { type BrowserContext, type Page, type Worker } from '@playwright/test'
import { expect, test } from './fixtures'

declare const chrome: typeof browser
declare const tabhangar: {
  handleMenuClick: (info: object, tab: object) => Promise<void>
  togglePopover: (tab: object) => Promise<void>
}

const ARTICLE = `<!doctype html><html><head><title>Backup SQLite nightly</title></head>
<body><h1>Backup SQLite nightly</h1><p id="quote">Use the .backup command for a consistent copy.</p>
<a id="link" href="https://example.org/docs">Docs</a></body></html>`

async function serveArticle(context: BrowserContext) {
  await context.route('https://site.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: ARTICLE }),
  )
  const page = await context.newPage()
  await page.goto('https://site.test/article')
  return page
}

async function worker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
}

/** Reads ids from the extension database inside the service worker. */
async function findIds(sw: Worker) {
  return sw.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tabhangar')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const all = <T>(store: string) =>
      new Promise<T[]>((resolve) => {
        const request = db.transaction(store).objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result as T[])
      })
    const groups = await all<{ id: string; title: string }>('groups')
    const categories = await all<{ id: string; name: string }>('categories')
    return {
      welcome: groups.find((g) => g.title === 'Welcome')!.id,
      today: categories.find((c) => c.name === 'Today')!.id,
    }
  })
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

test('saves the page from the context menu, shows a toast and undoes it', async ({
  context,
  extensionId,
}) => {
  const board = await openBoard(context, extensionId)
  const page = await serveArticle(context)
  const sw = await worker(context)
  const ids = await findIds(sw)
  const tab = await tabFor(sw, 'https://site.test/article')
  await sw.evaluate(
    ({ id, tab }) => tabhangar.handleMenuClick({ menuItemId: `save|g|${id}` }, tab),
    { id: ids.welcome, tab },
  )
  await expect(page.getByText('Saved to 👋 Welcome')).toBeVisible()
  await expect(
    board
      .getByRole('region', { name: 'Welcome' })
      .getByRole('link', { name: /Backup SQLite nightly/ }),
  ).toBeVisible()
  await expect
    .poll(() => sw.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tab.id))
    .toBe('1')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    board
      .getByRole('region', { name: 'Welcome' })
      .getByRole('link', { name: /Backup SQLite nightly/ }),
  ).toHaveCount(0)
})

test('saves a text selection as a note with its source', async ({ context, extensionId }) => {
  const board = await openBoard(context, extensionId)
  await serveArticle(context)
  const sw = await worker(context)
  const ids = await findIds(sw)
  const tab = await tabFor(sw, 'https://site.test/article')
  await sw.evaluate(
    ({ id, tab }) =>
      tabhangar.handleMenuClick(
        { menuItemId: `note|g|${id}`, selectionText: 'Use the .backup command' },
        tab,
      ),
    { id: ids.welcome, tab },
  )
  await expect(
    board.getByRole('region', { name: 'Welcome' }).getByText('Use the .backup command'),
  ).toBeVisible()
})

test('closes the tab and saves it into a new group', async ({ context, extensionId }) => {
  const board = await openBoard(context, extensionId)
  const page = await serveArticle(context)
  const sw = await worker(context)
  const ids = await findIds(sw)
  const tab = await tabFor(sw, 'https://site.test/article')
  await sw.evaluate(
    ({ id, tab }) => tabhangar.handleMenuClick({ menuItemId: `close|n|${id}` }, tab),
    { id: ids.today, tab },
  )
  await expect.poll(() => page.isClosed()).toBe(true)
  await expect(
    board
      .getByRole('region', { name: 'site.test' })
      .getByRole('link', { name: /Backup SQLite nightly/ }),
  ).toBeVisible()
})

test('saves the page with a note from the popover', async ({ context, extensionId }) => {
  const board = await openBoard(context, extensionId)
  const page = await serveArticle(context)
  const sw = await worker(context)
  const tab = await tabFor(sw, 'https://site.test/article')
  await sw.evaluate((tab) => tabhangar.togglePopover(tab), tab)
  const popover = page.getByRole('dialog', { name: 'TabHangar' })
  await expect(popover).toBeVisible()
  await popover.getByRole('textbox').fill('Read the cron section')
  await popover.getByRole('button', { name: /Quick links/ }).click()
  await popover.getByRole('button', { name: /Welcome/ }).click()
  await popover.getByRole('button', { name: 'Save' }).click()
  await expect(popover.getByText(/Saved to/)).toBeVisible()
  const group = board.getByRole('region', { name: 'Welcome' })
  await expect(group.getByRole('link', { name: /Backup SQLite nightly/ })).toBeVisible()
  await expect(group.getByText('Read the cron section')).toBeVisible()
  await expect(popover).toHaveCount(0, { timeout: 4000 })
})
