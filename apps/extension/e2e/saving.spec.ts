import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page, type Worker } from '@playwright/test'
import { expect, test } from './fixtures'

declare const chrome: typeof browser
declare const tabcabin: {
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
      const request = indexedDB.open('tabcabin')
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
    ({ id, tab }) => tabcabin.handleMenuClick({ menuItemId: `save|g|${id}` }, tab),
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
      tabcabin.handleMenuClick(
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
    ({ id, tab }) => tabcabin.handleMenuClick({ menuItemId: `close|n|${id}` }, tab),
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
  await sw.evaluate((tab) => tabcabin.togglePopover(tab), tab)
  const popover = page.getByRole('dialog', { name: 'TabCabin' })
  await expect(popover).toBeVisible()
  await popover.getByRole('textbox').fill('Read the cron section')
  await popover.getByRole('button', { name: /Quick links/ }).click()
  await popover.getByRole('button', { name: /Welcome/ }).click()
  await popover.getByRole('button', { name: 'Tomorrow' }).click()
  await popover.getByRole('button', { name: 'Save' }).click()
  await expect(popover.getByText(/Saved to/)).toBeVisible()
  const group = board.getByRole('region', { name: 'Welcome' })
  await expect(group.getByRole('link', { name: /Backup SQLite nightly/ })).toBeVisible()
  await expect(group.getByText('Read the cron section')).toBeVisible()
  await expect(group.getByRole('button', { name: /^Reminder: Tomorrow, 09:00/ })).toBeVisible()
  await expect(popover).toHaveCount(0, { timeout: 4000 })
})

test('keeps typing in the popover away from the page shortcuts', async ({ context }) => {
  // Like GitHub: "s" focuses the search box unless you are typing in a field.
  const shortcuts = `<!doctype html><title>Shortcuts page</title><input id="search">
<script>
  window.shortcutKeys = 0
  document.addEventListener('keydown', (event) => {
    const el = event.target
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable) return
    window.shortcutKeys++
    if (event.key === 's') {
      event.preventDefault()
      document.getElementById('search').focus()
    }
  })
</script>`
  await context.route('https://shortcuts.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: shortcuts }),
  )
  const page = await context.newPage()
  await page.goto('https://shortcuts.test/')
  const sw = await worker(context)
  const tab = await tabFor(sw, 'https://shortcuts.test/')
  await sw.evaluate((tab) => tabcabin.togglePopover(tab), tab)
  const popover = page.getByRole('dialog', { name: 'TabCabin' })
  const note = popover.getByRole('textbox')
  await note.click()
  await page.keyboard.type('Ask Sam about specs')
  await expect(note).toHaveValue('Ask Sam about specs')
  await expect(note).toBeFocused()
  expect(
    await page.evaluate(() => (window as unknown as { shortcutKeys: number }).shortcutKeys),
  ).toBe(0)
})

test('shows white and empty page icons so they can be seen', async ({ context, extensionId }) => {
  const svg = (inside: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${inside}</svg>`
  const icons: Record<string, string> = {
    // A white logo for dark browser tabs, like GitHub's when the system is dark.
    white: svg('<circle cx="16" cy="16" r="14" fill="white"/>'),
    empty: svg(''),
  }
  const board = await openBoard(context, extensionId)
  const sw = await worker(context)
  const { welcome } = await findIds(sw)
  for (const name of Object.keys(icons)) {
    await context.route(`https://${name}.test/**`, (route) =>
      route.request().url().endsWith('.svg')
        ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: icons[name] })
        : route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `<!doctype html><title>${name} icon</title><link rel="icon" href="/icon.svg">`,
          }),
    )
    const page = await context.newPage()
    await page.goto(`https://${name}.test/page`)
    const tab = await tabFor(sw, `https://${name}.test/page`)
    await sw.evaluate(
      ({ id, tab }) => tabcabin.handleMenuClick({ menuItemId: `save|g|${id}` }, tab),
      { id: welcome, tab },
    )
  }
  const group = board.getByRole('region', { name: 'Welcome' })
  const white = group.getByRole('link', { name: /white icon/ })
  await expect(white.locator('img')).toHaveCount(1)
  await expect(white.locator('span:has(> img)')).toHaveCSS('background-color', 'rgb(43, 47, 45)')
  const empty = group.getByRole('link', { name: /empty icon/ })
  await expect(empty).toBeVisible()
  await expect(empty.locator('img')).toHaveCount(0)
})

test('shows the page favicon for a saved page', async ({ context, extensionId }) => {
  const icon = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../public/icon/32.png'),
  )
  await context.route('https://iconic.test/**', (route) =>
    route.request().url().endsWith('.png')
      ? route.fulfill({ status: 200, contentType: 'image/png', body: icon })
      : route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><title>Iconic page</title><link rel="icon" href="/icon.png"><h1>Hi</h1>',
        }),
  )
  const board = await openBoard(context, extensionId)
  const page = await context.newPage()
  await page.goto('https://iconic.test/page')
  const sw = await worker(context)
  await expect
    .poll(async () => (await tabFor(sw, 'https://iconic.test/page')).favIconUrl)
    .toBeTruthy()
  const tab = await tabFor(sw, 'https://iconic.test/page')
  const { welcome } = await findIds(sw)
  await sw.evaluate(
    ({ id, tab }) => tabcabin.handleMenuClick({ menuItemId: `save|g|${id}` }, tab),
    { id: welcome, tab },
  )
  const link = board
    .getByRole('region', { name: 'Welcome' })
    .getByRole('link', { name: /Iconic page/ })
  await expect(link).toBeVisible()
  await expect(link.locator('img')).toHaveCount(1)
})
