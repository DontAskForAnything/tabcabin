import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures'

const serverMain = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/dist/main.js')
const PORT = 20_000 + Math.floor(Math.random() * 1000)
const SERVER = `http://127.0.0.1:${PORT}`
let server: ChildProcess | undefined
let dataDir = ''

test.beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'tabcabin-server-'))
  // A server where anyone may create an account.
  server = spawn(process.execPath, [serverMain], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      ALLOW_SIGNUP: 'true',
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
})

declare const tabcabin: { db: { meta: { put(row: object): Promise<unknown> } } }

test('asks for a new password twice when creating an account', async ({ context, extensionId }) => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await worker.evaluate(
    (server) => tabcabin.db.meta.put({ key: 'test.syncServer', value: server }),
    SERVER,
  )
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await page.getByRole('button', { name: 'Sign in to sync' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  // Signing in needs the password once.
  await expect(page.getByLabel('Repeat password')).toHaveCount(0)
  await page.getByRole('button', { name: /Create one/ }).click()
  await page.getByLabel('Username').fill('sam')
  await page.getByLabel('Password', { exact: true }).fill('correct horse')
  await page.getByLabel('Repeat password').fill('correct hrose')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('alert')).toHaveText('The passwords don’t match')
  await expect(page.getByLabel('Repeat password')).toBeFocused()

  await page.getByLabel('Repeat password').fill('correct horse')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'You’re signed in' })).toBeVisible()
})
