import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'

declare const tabcabin: { db: { meta: { put(row: object): Promise<unknown> } } }

/** Makes a tip due now, as if the first days had passed, with these tips already seen. */
async function tipsDue(context: BrowserContext, seen: string[] = []) {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await worker.evaluate(
    (seen) => tabcabin.db.meta.put({ key: 'tips', value: { seen, nextAt: 0 } }),
    seen,
  )
}

async function openBoard(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  return page
}

test('no tip in the first days', async ({ context, extensionId }) => {
  const page = await openBoard(context, extensionId)
  await page.waitForTimeout(2000)
  await expect(page.getByRole('region', { name: 'Did you know' })).toHaveCount(0)
})

test('shows a tip in the corner, the next one on request, then waits', async ({
  context,
  extensionId,
}) => {
  await tipsDue(context)
  const page = await openBoard(context, extensionId)
  const tip = page.getByRole('region', { name: 'Did you know' })
  await expect(tip).toContainText('Right-click a link on any page')
  await tip.getByRole('button', { name: 'Next tip' }).click()
  await expect(tip).toContainText('Select some text on a page')
  await tip.getByRole('button', { name: 'Close' }).click()
  await expect(tip).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await page.waitForTimeout(2000)
  await expect(tip).toHaveCount(0)
})

test('a tip shows the thing it talks about', async ({ context, extensionId }) => {
  await tipsDue(context, [
    'saveLink',
    'saveSelection',
    'todo',
    'newGroup',
    'stack',
    'select',
    'saveWindow',
    'collections',
  ])
  const page = await openBoard(context, extensionId)
  const tip = page.getByRole('region', { name: 'Did you know' })
  await expect(tip).toContainText('It waits in the bin')
  await tip.getByRole('button', { name: 'Open the bin' }).click()
  await expect(page.getByRole('dialog', { name: 'Bin' })).toBeVisible()
  await expect(tip).toHaveCount(0)
})

test('Settings turn the tips off', async ({ context, extensionId }) => {
  await tipsDue(context)
  const page = await openBoard(context, extensionId)
  await expect(page.getByRole('region', { name: 'Did you know' })).toBeVisible()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('switch', { name: 'Show a tip now and then' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)
  await expect(page.getByRole('region', { name: 'Did you know' })).toHaveCount(0)
})
