import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext } from '@playwright/test'
import { expect, test } from './fixtures'

const serverMain = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/dist/main.js')
const PORT = 19_000 + Math.floor(Math.random() * 500)
const GOOGLE_PORT = PORT + 500
const SERVER = `http://127.0.0.1:${PORT}`
const CLIENT_ID = 'test-client.apps.googleusercontent.com'

/** Who the fake Google says is signing in. */
let account = { sub: 'g-1', email: 'ola@studio.dev' }
let google: Server | undefined
let server: ChildProcess | undefined
/** Created in beforeAll: Playwright also loads this file just to list the tests. */
let dataDir = ''

/** Stands in for Google: approves every sign-in at once and returns an ID token for `account`. */
function fakeGoogle(): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${GOOGLE_PORT}`)
    if (url.pathname === '/auth') {
      const back = new URL(url.searchParams.get('redirect_uri')!)
      back.searchParams.set('state', url.searchParams.get('state')!)
      back.searchParams.set('code', 'fake-code')
      res.writeHead(302, { Location: back.toString() }).end()
      return
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
      const claims = {
        iss: 'fake-google',
        aud: CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 600,
        email_verified: true,
        ...account,
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id_token: `${part({ alg: 'none' })}.${part(claims)}.x` }))
      return
    }
    res.writeHead(404).end()
  }).listen(GOOGLE_PORT, '127.0.0.1')
}

test.beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'tabhangar-server-'))
  google = fakeGoogle()
  server = spawn(process.execPath, [serverMain], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      PUBLIC_URL: SERVER,
      GOOGLE_CLIENT_ID: CLIENT_ID,
      GOOGLE_CLIENT_SECRET: 'test-secret',
      GOOGLE_AUTH_URL: `http://127.0.0.1:${GOOGLE_PORT}/auth`,
      GOOGLE_TOKEN_URL: `http://127.0.0.1:${GOOGLE_PORT}/token`,
      SIGNUP_EMAILS: '@studio.dev',
    },
    stdio: 'ignore',
  })
  await expect
    .poll(
      () =>
        fetch(`${SERVER}/health`).then(
          (r) => r.ok,
          () => false,
        ),
      { timeout: 15_000 },
    )
    .toBe(true)
})

test.afterAll(() => {
  server?.kill()
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
  google?.close()
})

declare const tabhangar: { db: { meta: { put(row: object): Promise<unknown> } } }

/** Opens the sign-in page of a test build pointed at this test's server. */
async function openSignIn(context: BrowserContext, extensionId: string) {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await worker.evaluate(
    (server) => tabhangar.db.meta.put({ key: 'test.syncServer', value: server }),
    SERVER,
  )
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.getByRole('button', { name: 'Sign in to sync' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  return page
}

test('signs in with Google and creates the invited account', async ({ context, extensionId }) => {
  account = { sub: 'g-1', email: 'ola@studio.dev' }
  const page = await openSignIn(context, extensionId)
  // Signup is off on this server: no "create one" link, but Google invites work.
  await expect(page.getByText(/invite your Google address/)).toBeVisible()
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('heading', { name: 'You’re signed in' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/Hi ola!/)).toBeVisible()
  await page.getByRole('button', { name: 'Open my boards' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Account & sync' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog.getByText('ola@studio.dev')).toBeVisible()
  await expect(dialog.getByText('Up to date')).toBeVisible({ timeout: 15_000 })
})

test('explains when a Google account is not invited', async ({ context, extensionId }) => {
  account = { sub: 'g-2', email: 'stranger@gmail.com' }
  const page = await openSignIn(context, extensionId)
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('alert')).toHaveText(/can’t join this server yet/)
  // Username and password stay one small click away.
  await expect(page.getByLabel('Username')).toHaveCount(0)
  await page.getByRole('button', { name: 'or with a username and password' }).click()
  await expect(page.getByLabel('Username')).toBeFocused()
})
