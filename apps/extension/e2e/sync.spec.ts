import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, extensionIdOf, launchExtension, test } from './fixtures'

const serverMain = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/dist/main.js')
const PORT = 18_000 + Math.floor(Math.random() * 1000)
/**
 * By default a fresh server is started from apps/server/dist. Set SYNC_SERVER to test
 * against a running one instead (e.g. the Docker image), with the account michal /
 * "correct horse" and no data yet.
 */
const SERVER = process.env.SYNC_SERVER ?? `http://127.0.0.1:${PORT}`
let server: ChildProcess | undefined
/** Created in beforeAll: Playwright also loads this file just to list the tests. */
let dataDir = ''

test.beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'tabcabin-server-'))
  if (!process.env.SYNC_SERVER)
    server = spawn(process.execPath, [serverMain], {
      env: {
        ...process.env,
        PORT: String(PORT),
        HOST: '127.0.0.1',
        DATA_DIR: dataDir,
        ADMIN_USERNAME: 'michal',
        ADMIN_PASSWORD: 'correct horse',
      },
      stdio: 'ignore',
    })
  await expect
    .poll(
      () =>
        fetch(`${SERVER}/health`)
          .then((r) => r.ok)
          .catch(() => false),
      { timeout: 15_000 },
    )
    .toBe(true)
})

test.afterAll(() => {
  server?.kill()
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
})

declare const tabcabin: { db: { meta: { put(row: object): Promise<unknown> } } }

async function openBoard(context: BrowserContext): Promise<Page> {
  // Point the test build at the server of this test.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await worker.evaluate(
    (server) => tabcabin.db.meta.put({ key: 'test.syncServer', value: server }),
    SERVER,
  )
  const page = await context.newPage()
  await page.goto(`chrome-extension://${await extensionIdOf(context)}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

/** From the board's "Sign in" button to the filled-in sign-in page. */
async function signIn(page: Page, password = 'correct horse') {
  await page.getByRole('button', { name: 'Sign in to sync' }).click()
  await expect(page).toHaveURL(/\/signin\.html$/)
  // No Google on this server, so the username and password form shows right away.
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByLabel('Username').fill('michal')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

async function accountDialog(page: Page) {
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Account & sync' }).click()
  return page.getByRole('dialog', { name: 'Settings' })
}

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
