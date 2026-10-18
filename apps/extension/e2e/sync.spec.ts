import { type BrowserContext } from '@playwright/test'
import { expect, launchExtension, test } from './fixtures'
import {
  accountDialog,
  openBoard as openBoardAt,
  signIn,
  startSyncServer,
  type SyncServer,
} from './syncServer'

/**
 * By default a fresh server is started from apps/server/dist. Set SYNC_SERVER to test
 * against a running one instead (e.g. the Docker image), with the account michal /
 * "correct horse" and no data yet.
 */
let SERVER = process.env.SYNC_SERVER ?? ''
let server: SyncServer | undefined

test.beforeAll(async () => {
  if (SERVER) return
  server = await startSyncServer()
  SERVER = server.url
})

test.afterAll(() => server?.stop())

const openBoard = (context: BrowserContext) => openBoardAt(context, SERVER)

test('syncs boards between two browsers through the server', async ({ context }) => {
  test.setTimeout(90_000)
  // Browser A: rename a group so its data is recognizable, then connect (uploads everything).
  const a = await openBoard(context)
  await a.getByRole('heading', { name: 'Welcome' }).dblclick()
  await a.getByPlaceholder('Group name').fill('Shared plans')
  await a.getByPlaceholder('Group name').press('Enter')
  await signIn(a)
  await expect(a.getByRole('heading', { name: 'You’re signed in' })).toBeVisible()
  await a.getByRole('button', { name: 'Open my boards' }).click()
  const dialogA = await accountDialog(a)
  await expect(dialogA.getByText('Signed in as michal')).toBeVisible()
  await expect(dialogA.getByText('Up to date')).toBeVisible({ timeout: 15_000 })
  await a.keyboard.press('Escape')
  // Signed in, the top bar stays quiet: no sign-in button and no sync status.
  await expect(a.getByRole('button', { name: 'Sign in to sync' })).toHaveCount(0)
  await expect(a.getByRole('button', { name: /^Up to date/ })).toHaveCount(0)

  // Browser B: has its own starter data, so it asks what to do; take the server's copy.
  const other = await launchExtension()
  try {
    const b = await openBoard(other)
    await signIn(b)
    await b.getByRole('button', { name: /Use the server’s data/ }).click()
    await expect(b.getByRole('heading', { name: 'You’re signed in' })).toBeVisible()
    await b.getByRole('button', { name: 'Open my boards' }).click()
    await expect(b.getByRole('heading', { name: 'Shared plans' })).toBeVisible()
    await expect(b.getByRole('heading', { name: 'Welcome' })).toHaveCount(0)

    // A change in A shows up in B without reloading.
    const group = a.getByRole('region', { name: 'Shared plans' })
    await group.getByRole('button', { name: 'Note or link' }).click()
    await a.getByPlaceholder('Write a note or paste a link…').fill('Hello from the laptop')
    await a.getByPlaceholder('Write a note or paste a link…').press('Enter')
    await expect(
      b.getByRole('region', { name: 'Shared plans' }).getByText('Hello from the laptop'),
    ).toBeVisible({ timeout: 20_000 })
  } finally {
    await other.close()
  }
})

test('rejects a wrong password and explains how to get an account', async ({ context }) => {
  const page = await openBoard(context)
  await signIn(page, 'wrong password')
  await expect(page.getByRole('alert')).toHaveText('Wrong username or password')
  // Sign-up is off on this server, so there is no "create one" link, only a hint.
  await expect(page.getByText(/Ask the person who runs this server/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Create one/ })).toHaveCount(0)
  await page.getByRole('button', { name: /back to my boards/ }).click()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
})

test('shares a group as a read-only page and takes it down again', async ({ context }) => {
  const page = await openBoard(context)
  await signIn(page)
  // The server may already hold boards from the other tests.
  const keepBoth = page.getByRole('button', { name: /Keep both/ })
  const signedIn = page.getByRole('heading', { name: 'You’re signed in' })
  await expect(keepBoth.or(signedIn)).toBeVisible()
  if (await keepBoth.isVisible()) await keepBoth.click()
  await page.getByRole('button', { name: 'Open my boards' }).click()

  const group = page.getByRole('region', { name: 'Quick links' }).first()
  await group.getByRole('button', { name: 'Group options' }).click()
  await page.getByRole('menuitem', { name: 'Share a read-only link' }).click()
  const dialog = page.getByRole('dialog', { name: 'Read-only link' })
  await dialog.getByRole('button', { name: 'Create link' }).click()
  const link = dialog.getByRole('textbox', { name: 'Link to this group' })
  await expect(link).toHaveValue(new RegExp(`^${SERVER}/s/[\\w-]{22}$`), { timeout: 15_000 })
  const url = await link.inputValue()

  const shared = await fetch(url)
  expect(shared.status).toBe(200)
  const html = await shared.text()
  expect(html).toContain('Quick links')
  expect(html).toContain('github.com')

  await dialog.getByRole('button', { name: 'Stop sharing' }).click()
  await expect(dialog.getByRole('button', { name: 'Create link' })).toBeVisible()
  expect((await fetch(url)).status).toBe(404)
})
