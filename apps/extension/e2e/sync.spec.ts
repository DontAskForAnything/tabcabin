import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, extensionIdOf, launchExtension, test } from './fixtures'

const serverMain = resolve(dirname(fileURLToPath(import.meta.url)), '../../server/dist/main.js')
const PORT = 18_000 + Math.floor(Math.random() * 1000)
const SERVER = `http://127.0.0.1:${PORT}`
let server: ChildProcess

test.beforeAll(async () => {
  server = spawn(process.execPath, [serverMain], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATA_DIR: mkdtempSync(join(tmpdir(), 'tabhangar-server-')),
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
})

async function openBoard(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${await extensionIdOf(context)}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

async function signIn(page: Page) {
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Account & sync' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByLabel('Server address').fill(SERVER)
  await expect(dialog.getByText(/Server responds · v/)).toBeVisible()
  await dialog.getByLabel('Username').fill('michal')
  await dialog.getByLabel('Password').fill('correct horse')
  await dialog.getByRole('button', { name: 'Sign in' }).click()
  return dialog
}

test('syncs boards between two browsers through the server', async ({ context }) => {
  test.setTimeout(90_000)
  // Browser A: rename a group so its data is recognizable, then connect (uploads everything).
  const a = await openBoard(context)
  await a.getByRole('heading', { name: 'Welcome' }).dblclick()
  await a.getByPlaceholder('Group name').fill('Shared plans')
  await a.getByPlaceholder('Group name').press('Enter')
  const dialogA = await signIn(a)
  await expect(dialogA.getByText('Signed in as michal')).toBeVisible()
  await expect(dialogA.getByText('Up to date')).toBeVisible({ timeout: 15_000 })
  await a.keyboard.press('Escape')

  // Browser B: has its own starter data, so it asks what to do; take the server's copy.
  const other = await launchExtension()
  try {
    const b = await openBoard(other)
    const dialogB = await signIn(b)
    await dialogB.getByRole('button', { name: /Use the server’s data/ }).click()
    await expect(dialogB.getByText('Signed in as michal')).toBeVisible()
    await b.keyboard.press('Escape')
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

test('rejects a wrong password and explains disabled sign-up', async ({ context }) => {
  const page = await openBoard(context)
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Account & sync' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByLabel('Server address').fill(SERVER)
  await dialog.getByLabel('Username').fill('michal')
  await dialog.getByLabel('Password').fill('wrong password')
  await dialog.getByRole('button', { name: 'Sign in' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Wrong username or password')
  await dialog.getByLabel('Username').fill('newbie')
  await dialog.getByRole('button', { name: 'Create account' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Sign-up is turned off')
})
