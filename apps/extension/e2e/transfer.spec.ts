import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

declare const chrome: typeof browser

const fixtures = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/core/src/transfer/fixtures',
)
const fixture = resolve(fixtures, 'tabextend-export.json')

async function openData(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('tab', { name: 'Data' }).click()
  return page
}

test('exports a workspace as JSON and imports it again', async ({ context, extensionId }) => {
  const page = await openData(context, extensionId)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'JSON' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^tabcabin-personal-\d{4}-\d{2}-\d{2}\.json$/)
  const path = await download.path()
  const backup = JSON.parse(readFileSync(path, 'utf8'))
  expect(backup).toMatchObject({ format: 'tabcabin', version: 1 })
  expect(backup.groups.length).toBeGreaterThan(2)

  await dialog.getByLabel('Import from a file').setInputFiles(path)
  await expect(page.getByText('Imported 1 workspace')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Switch workspace' }).click()
  await expect(page.getByRole('menuitem', { name: 'Personal' })).toHaveCount(2)
})

test('exports bookmarks and CSV files', async ({ context, extensionId }) => {
  const page = await openData(context, extensionId)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('radio', { name: 'All workspaces' }).click()
  const [html] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Bookmarks' }).click(),
  ])
  expect(readFileSync(await html.path(), 'utf8')).toContain('>GitHub</A>')
  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'CSV' }).click(),
  ])
  expect(readFileSync(await csv.path(), 'utf8')).toContain('Personal,Today,Quick links,link,GitHub')
})

test('imports a tabExtend export into a new workspace', async ({ context, extensionId }) => {
  const page = await openData(context, extensionId)
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByLabel('Import from a file')
    .setInputFiles(fixture)
  await expect(page.getByText('Imported 1 workspace')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tab', { name: 'Work' })).toHaveAttribute('aria-selected', 'true')
  const docs = page.getByRole('region', { name: 'Docs' })
  await expect(docs.getByRole('link', { name: /Example handbook/ })).toBeVisible()
  await expect(docs.getByText('Read chapter 2 first')).toBeVisible()
  await expect(docs.getByRole('checkbox', { name: 'Mark as not done' })).toBeChecked()
})

test('imports Toby, bookmark files and OneTab lists', async ({ context, extensionId }) => {
  const page = await openData(context, extensionId)
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  const input = dialog.getByLabel('Import from a file')

  await input.setInputFiles(resolve(fixtures, 'toby-organization.json'))
  await expect(page.getByText('Imported 1 workspace')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(
    'Imported from Toby',
  )
  await expect(page.getByRole('tab', { name: 'Studio' })).toHaveAttribute('aria-selected', 'true')
  const clients = page.getByRole('region', { name: 'Clients' })
  await expect(clients.getByRole('link', { name: /Client portal/ })).toBeVisible()
  await expect(clients.getByText('Invoices go out on the 1st')).toBeVisible()

  for (const [file, workspace, group] of [
    ['bookmarks.html', 'Imported bookmarks', 'Research'],
    ['onetab.txt', 'Imported from OneTab', 'Links'],
  ] as const) {
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()
    await dialog.getByRole('tab', { name: 'Data' }).click()
    await input.setInputFiles(resolve(fixtures, file))
    await expect(page.getByText('Imported 1 workspace').last()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(workspace)
    await expect(page.getByRole('heading', { name: group }).first()).toBeVisible()
  }
})

test('turns bookmark folders into groups', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await page.evaluate(async () => {
    const folder = await chrome.bookmarks.create({ parentId: '2', title: 'Recipes' })
    await chrome.bookmarks.create({
      parentId: folder.id,
      title: 'Soup',
      url: 'https://soup.example/',
    })
    const sub = await chrome.bookmarks.create({ parentId: folder.id, title: 'Cakes' })
    await chrome.bookmarks.create({
      parentId: sub.id,
      title: 'Cheesecake',
      url: 'https://cake.example/',
    })
  })
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Import bookmarks' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import bookmarks' })
  await expect(dialog.getByText('Recipes')).toBeVisible()
  await dialog.getByRole('checkbox', { name: 'Recipes' }).click()
  await dialog.getByRole('button', { name: 'Import 1 folder' }).click()
  const group = page.getByRole('region', { name: 'Recipes' })
  await expect(group.getByRole('link', { name: /Soup/ })).toBeVisible()
  await expect(group.getByRole('link', { name: /Cheesecake/ })).toBeVisible()
})
