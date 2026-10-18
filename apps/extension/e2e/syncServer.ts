import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, extensionIdOf } from './fixtures'

const serverMain = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/dist/main.js')

export interface SyncServer {
  url: string
  stop: () => void
}

/**
 * Starts the built server (apps/server/dist) on a random port with an empty data folder. Without
 * other `env` it has the admin account michal / "correct horse" and sign-up turned off.
 */
export async function startSyncServer(
  env: Record<string, string> = {},
  port = 18_000 + Math.floor(Math.random() * 2000),
): Promise<SyncServer> {
  const url = `http://127.0.0.1:${port}`
  const dataDir = mkdtempSync(join(tmpdir(), 'tabcabin-server-'))
  const server: ChildProcess = spawn(process.execPath, [serverMain], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      ADMIN_USERNAME: 'michal',
      ADMIN_PASSWORD: 'correct horse',
      ...env,
    },
    stdio: 'ignore',
  })
  await expect
    .poll(
      () =>
        fetch(`${url}/health`).then(
          (r) => r.ok,
          () => false,
        ),
      { timeout: 15_000 },
    )
    .toBe(true)
  return {
    url,
    stop: () => {
      server.kill()
      rmSync(dataDir, { recursive: true, force: true })
    },
  }
}

declare const tabcabin: { db: { meta: { put(row: object): Promise<unknown> } } }

/** Points the test build at a server (the meta row is only read in e2e builds). */
export async function pointAt(context: BrowserContext, url: string) {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await worker.evaluate(
    (server) => tabcabin.db.meta.put({ key: 'test.syncServer', value: server }),
    url,
  )
}

/** A board page of a test build pointed at `url`. */
export async function openBoard(context: BrowserContext, url: string): Promise<Page> {
  await pointAt(context, url)
  const page = await context.newPage()
  await page.goto(`chrome-extension://${await extensionIdOf(context)}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

/** From the board's "Sign in" button to the filled-in sign-in page. */
export async function signIn(page: Page, password = 'correct horse') {
  await page.getByRole('button', { name: 'Sign in to sync' }).click()
  await expect(page).toHaveURL(/\/signin\.html$/)
  // No Google on this server, so the username and password form shows right away.
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByLabel('Username').fill('michal')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

/** Settings opened on "Account & sync". */
export async function accountDialog(page: Page) {
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Account & sync' }).click()
  return page.getByRole('dialog', { name: 'Settings' })
}
