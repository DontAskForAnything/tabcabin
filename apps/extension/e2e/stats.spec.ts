import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, launchExtension, test } from './fixtures'
import { accountDialog, openBoard, signIn, startSyncServer, type SyncServer } from './syncServer'

declare const chrome: typeof browser

const fixtures = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/core/src/transfer/fixtures',
)

let server: SyncServer | undefined

test.beforeAll(async () => {
  server = await startSyncServer()
})

test.afterAll(() => server?.stop())

async function board(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

/** Opens "This week" and returns its three numbers: tabs closed, links saved, to-dos done. */
async function week(page: Page) {
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'This week' }).click()
  return page.getByRole('dialog', { name: 'This week' })
}

/** Pages on https://pages.test answer with their path as the title. */
async function servePages(context: BrowserContext) {
  await context.route('https://pages.test/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<title>${new URL(route.request().url()).pathname.slice(1)}</title>`,
    }),
  )
}

/** Opens a page in a new tab, as someone browsing would, and closes it again with Chrome's X. */
async function browseAndClose(context: BrowserContext, path: string) {
  const tab = await context.newPage()
  await tab.goto(`https://pages.test/${path}`)
  await expect(tab).toHaveTitle(path)
  await tab.close()
}

test('tells how many tabs TabCabin closed this week, quietly', async ({ context, extensionId }) => {
  for (const title of ['Alpha page', 'Beta page']) {
    const other = await context.newPage()
    await other.goto(`data:text/html,<title>${title}</title>`)
  }
  const page = await board(context, extensionId)
  const panel = page.getByRole('navigation', { name: 'Open tabs' })
  await expect(panel.getByRole('button', { name: 'Alpha page' })).toBeVisible()
  await expect(panel.getByText(/this week/)).toHaveCount(0)

  await panel.getByRole('button', { name: 'Save all tabs' }).click()
  await page.getByRole('menuitem', { name: 'Save all into a new group' }).click()
  await panel.getByRole('button', { name: '2 tabs closed this week' }).click()

  const dialog = page.getByRole('dialog', { name: 'This week' })
  await expect(dialog.getByRole('definition')).toHaveText(['2', '2', '0'])
  await expect(dialog).toContainText('tabs closed')
  await expect(dialog).toContainText('The last seven days in this browser.')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('tab', { name: 'Appearance' }).click()
  await settings.getByRole('switch', { name: 'Show the week in the tabs panel' }).click()
  await page.keyboard.press('Escape')
  await expect(panel.getByText(/this week/)).toHaveCount(0)
})

test('counts tabs closed in Chrome itself, and each finished to-do once', async ({
  context,
  extensionId,
}) => {
  await servePages(context)
  const page = await board(context, extensionId)
  await browseAndClose(context, 'news')
  await browseAndClose(context, 'weather')
  // An empty new tab is not a page.
  const empty = await context.newPage()
  await empty.close()
  const panel = page.getByRole('navigation', { name: 'Open tabs' })
  await expect(panel.getByRole('button', { name: '2 tabs closed this week' })).toBeVisible()

  // The starter board's finished to-do moves and goes to the bin: it was done before this week.
  const todo = page.getByRole('region', { name: 'To do' })
  await todo.getByText('Move into TabCabin').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const task = todo.getByRole('checkbox', { name: 'Mark as done' }).first()
  await task.click()
  await expect(todo.getByRole('checkbox', { name: 'Mark as not done' })).toHaveCount(1)
  // Ticking off and back on again is still one to-do.
  await todo.getByRole('checkbox', { name: 'Mark as not done' }).click()
  await todo.getByRole('checkbox', { name: 'Mark as done' }).first().click()

  const dialog = await week(page)
  await expect(dialog.getByRole('definition')).toHaveText(['2', '0', '1'])
})

test('imports, templates and undone saves are not saved links', async ({
  context,
  extensionId,
}) => {
  await servePages(context)
  const page = await board(context, extensionId)

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('tab', { name: 'Data' }).click()
  await settings.getByLabel('Import from a file').setInputFiles(resolve(fixtures, 'onetab.txt'))
  await expect(page.getByText('Imported 1 workspace')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await page.getByRole('menuitem', { name: 'New workspace' }).click()
  const create = page.getByRole('dialog', { name: 'New workspace' })
  await create.getByRole('button', { name: 'Home' }).click()
  await create.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('heading', { name: 'Shopping' })).toBeVisible()

  // Saving a whole window counts its links; undo takes them back (the closed tabs stay closed).
  const windows = () => page.evaluate(async () => (await chrome.windows.getAll()).length)
  await page.evaluate(() =>
    chrome.windows.create({ url: ['https://pages.test/North', 'https://pages.test/South'] }),
  )
  await expect.poll(windows).toBe(2)
  const panel = page.getByRole('navigation', { name: 'Open tabs' })
  await panel.getByRole('button', { name: /This window/ }).click()
  await page.getByRole('menuitem', { name: /Window \d · 2 tabs/ }).click()
  await panel.getByRole('button', { name: 'Save all tabs' }).click()
  await page.getByRole('menuitem', { name: 'Save as one group and close' }).click()
  await page.getByText('Saved 2 tabs and closed the window').waitFor()
  const dialog = await week(page)
  await expect(dialog.getByRole('definition')).toHaveText(['2', '2', '0'])
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(windows).toBe(2)

  await week(page)
  await expect(dialog.getByRole('definition')).toHaveText(['2', '0', '0'])
})

test('every computer of the account shows the same week', async ({ context }) => {
  test.setTimeout(120_000)
  // Laptop: closes two tabs before signing in; they go to the account with the boards.
  await servePages(context)
  const laptop = await openBoard(context, server!.url)
  await browseAndClose(context, 'one')
  await browseAndClose(context, 'two')
  await signIn(laptop)
  await laptop.getByRole('button', { name: 'Open my boards' }).click()
  await expect((await accountDialog(laptop)).getByText('Up to date')).toBeVisible({
    timeout: 15_000,
  })
  await laptop.keyboard.press('Escape')

  // Work computer: takes the account's boards and saves one link.
  const other = await launchExtension()
  try {
    const work = await openBoard(other, server!.url)
    await signIn(work)
    await work.getByRole('button', { name: /Use the server’s data/ }).click()
    await work.getByRole('button', { name: 'Open my boards' }).click()
    const group = work.getByRole('region', { name: 'Quick links' })
    await group.getByRole('button', { name: 'Note or link' }).click()
    await work.getByPlaceholder('Write a note or paste a link…').fill('wxt.dev')
    await work.getByPlaceholder('Write a note or paste a link…').press('Enter')

    for (const page of [work, laptop]) {
      const dialog = await week(page)
      await expect(dialog).toContainText('The last seven days on all your computers.')
      await expect(dialog.getByRole('definition')).toHaveText(['2', '1', '0'], {
        timeout: 20_000,
      })
      await page.keyboard.press('Escape')
    }

    // Removing everything from the work computer keeps its numbers in the account.
    const settings = await accountDialog(work)
    await settings.getByRole('button', { name: 'Sign out' }).click()
    await work.getByRole('button', { name: /Someone else’s, or shared/ }).click()
    await expect(work.getByRole('dialog', { name: 'Welcome to TabCabin' })).toBeVisible({
      timeout: 15_000,
    })
    const laptopWeek = await week(laptop)
    await expect(laptopWeek.getByRole('definition')).toHaveText(['2', '1', '0'])
  } finally {
    await other.close()
  }
})
