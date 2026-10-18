import { type BrowserContext, type Page } from '@playwright/test'
import { expect, extensionIdOf, test } from './fixtures'
import {
  accountDialog,
  openBoard,
  pointAt,
  signIn,
  startSyncServer,
  type SyncServer,
} from './syncServer'

let server: SyncServer | undefined

test.beforeAll(async () => {
  server = await startSyncServer()
})

test.afterAll(() => server?.stop())

declare const tabcabin: { db: { meta: { get(key: string): Promise<{ value: unknown }> } } }

/** Signs in to `url` from a board page (keeping both copies when asked) and returns to the board. */
async function signedIn(context: BrowserContext, url = server!.url): Promise<Page> {
  const page = await openBoard(context, url)
  await signIn(page)
  const keepBoth = page.getByRole('button', { name: /Keep both/ })
  const done = page.getByRole('heading', { name: 'You’re signed in' })
  await expect(keepBoth.or(done)).toBeVisible()
  if (await keepBoth.isVisible()) await keepBoth.click()
  await page.getByRole('button', { name: 'Open my boards' }).click()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

async function addNote(page: Page, text: string) {
  const group = page.getByRole('region', { name: 'Quick links' }).first()
  await group.getByRole('button', { name: 'Note or link' }).click()
  await page.getByPlaceholder('Write a note or paste a link…').fill(text)
  await page.getByPlaceholder('Write a note or paste a link…').press('Enter')
  await expect(group.getByText(text)).toBeVisible()
}

/** Settings → Account & sync → Sign out, once everything is uploaded. */
async function openSignOut(page: Page, { synced = true } = {}) {
  const settings = await accountDialog(page)
  if (synced) await expect(settings.getByText('Up to date')).toBeVisible({ timeout: 15_000 })
  await settings.getByRole('button', { name: 'Sign out' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sign out' })
  await expect(dialog).toContainText('Whose computer is this?')
  return dialog
}

async function sessionToken(context: BrowserContext): Promise<string> {
  const worker = context.serviceWorkers()[0]!
  return worker.evaluate(
    async () => ((await tabcabin.db.meta.get('sync.account')).value as { token: string }).token,
  )
}

const pull = (url: string, token: string) =>
  fetch(`${url}/sync/pull?since=0`, { headers: { Authorization: `Bearer ${token}` } })

test('on your own computer the boards stay and only syncing stops', async ({ context }) => {
  const page = await signedIn(context)
  await addNote(page, 'Packing list')
  const token = await sessionToken(context)

  const dialog = await openSignOut(page)
  // Signed in with a password: nothing to say about Google.
  await expect(dialog.getByText(/Google/)).toHaveCount(0)
  await dialog.getByRole('button', { name: /^Mine/ }).click()
  await expect(page.getByText('Signed out', { exact: true })).toBeVisible()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await page.keyboard.press('Escape')

  await expect(page.getByText('Packing list')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in to sync' })).toBeVisible()
  expect((await pull(server!.url, token)).status).toBe(401)
})

test('on someone else’s computer everything here is removed and the account keeps it', async ({
  context,
}) => {
  test.setTimeout(60_000)
  const page = await signedIn(context)
  await addNote(page, 'Passport numbers')
  // A second TabCabin page (the side panel) is open too.
  const panel = await context.newPage()
  await panel.goto(`chrome-extension://${await extensionIdOf(context)}/sidepanel.html`)
  await expect(panel.getByText('Passport numbers')).toBeVisible()
  await panel.evaluate(() => Object.assign(window, { beforeSignOut: true }))

  const dialog = await openSignOut(page)
  await dialog.getByRole('button', { name: /Someone else’s, or shared/ }).click()

  // The page starts over like a fresh install: the welcome dialog and the starter board.
  await expect(page.getByRole('dialog', { name: 'Welcome to TabCabin' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(
    page.getByText('Signed out. Your boards are no longer in this browser.'),
  ).toBeVisible()
  await expect(page.getByText('Passport numbers')).toHaveCount(0)
  await expect.poll(() => panel.evaluate(() => 'beforeSignOut' in window)).toBe(false)
  await expect(panel.getByText('Passport numbers')).toHaveCount(0)

  // Signing in again brings everything back from the account.
  await page.getByRole('dialog', { name: 'Welcome to TabCabin' }).press('Escape')
  await pointAt(context, server!.url)
  await page.reload()
  await signIn(page)
  await page.getByRole('button', { name: /Use the server’s data/ }).click()
  await page.getByRole('button', { name: 'Open my boards' }).click()
  // The account holds a starter workspace from every test browser: look it up with search.
  await expect(page.getByRole('heading', { name: 'Quick links' }).first()).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('dialog').getByRole('button', { name: 'All workspaces' }).click()
  await page.keyboard.type('passport')
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Passport numbers/ }),
  ).toBeVisible()
})

test('asks before removing changes that could not reach the account', async ({ context }) => {
  test.setTimeout(60_000)
  const own = await startSyncServer()
  try {
    const page = await signedIn(context, own.url)
    await expect((await accountDialog(page)).getByText('Up to date')).toBeVisible({
      timeout: 15_000,
    })
    await page.keyboard.press('Escape')
    own.stop()
    await addNote(page, 'Written offline')

    const dialog = await openSignOut(page, { synced: false })
    await dialog.getByRole('button', { name: /Someone else’s, or shared/ }).click()
    const warning = page.getByRole('dialog', { name: 'Some changes are only in this browser' })
    await expect(warning).toContainText(/1 change hasn’t reached your account yet/)
    await warning.getByRole('button', { name: 'Try again' }).click()
    await expect(warning.getByRole('button', { name: 'Try again' })).toBeEnabled()
    await expect(page.getByText('Written offline')).toBeVisible()

    await warning.getByRole('button', { name: 'Remove anyway' }).click()
    await expect(page.getByRole('dialog', { name: 'Welcome to TabCabin' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Written offline')).toHaveCount(0)
  } finally {
    own.stop()
  }
})

test('deleting all data while signed in also ends the session', async ({ context }) => {
  const page = await signedIn(context)
  const token = await sessionToken(context)
  expect((await pull(server!.url, token)).status).toBe(200)

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('tab', { name: 'Data' }).click()
  await page.getByRole('button', { name: 'Delete everything' }).click()
  await page
    .getByRole('dialog', { name: 'Delete all data' })
    .getByRole('button', {
      name: 'Delete everything',
    })
    .click()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await expect.poll(async () => (await pull(server!.url, token)).status).toBe(401)
})
