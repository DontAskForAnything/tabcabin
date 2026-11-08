import { expect, test } from './fixtures'
import { routeSite, sendFromSite as send, SITE } from './site'

declare const chrome: { runtime?: { sendMessage?: unknown } }

test('the website adds a template and opens it', async ({ context, extensionId }) => {
  await routeSite(context, 'Trip board template')
  const site = await context.newPage()
  await site.goto(`${SITE}/templates/trip/`)

  expect(await send(site, extensionId, { type: 'tabcabin:hello' })).toEqual({
    ok: true,
    version: expect.any(String),
  })
  expect(await send(site, extensionId, { type: 'tabcabin:add-template', id: 'camping' })).toEqual({
    ok: false,
    error: 'unknown-template',
  })
  expect(await send(site, extensionId, { type: 'tabcabin:open', url: 'https://x.test' })).toEqual({
    ok: false,
    error: 'unknown-message',
  })

  const [board] = await Promise.all([
    context.waitForEvent('page', (opened) => opened.url().endsWith('/newtab.html')),
    expect(send(site, extensionId, { type: 'tabcabin:add-template', id: 'trip' })).resolves.toEqual(
      { ok: true, workspace: 'Trip' },
    ),
  ])
  await expect(board.getByRole('button', { name: 'Switch workspace' })).toHaveText('🧳Trip')
  for (const title of ['Stays', 'Tickets', 'Places', 'Pack'])
    await expect(board.getByRole('heading', { name: title })).toBeVisible()
  await expect(board.getByRole('dialog')).toHaveCount(0)
})

test.describe('installed from a template page', () => {
  test.use({ welcome: true })

  test('opens the picked template right away', async ({ context }) => {
    await routeSite(context, 'Moving template')
    const site = await context.newPage()
    await site.goto(`${SITE}/templates/moving/`)
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))

    // What runs when Chrome installs TabCabin, with the template page still open.
    const [board] = await Promise.all([
      context.waitForEvent('page', (opened) => opened.url().endsWith('/newtab.html')),
      worker.evaluate(() =>
        (
          globalThis as unknown as { tabcabin: { addTemplateOnInstall(): Promise<void> } }
        ).tabcabin.addTemplateOnInstall(),
      ),
    ])
    // The welcome skips "How would you like to start?": the template answered it.
    await board
      .getByRole('dialog', { name: 'Welcome to TabCabin' })
      .getByRole('button', { name: 'Get started' })
      .click()
    const tips = board.getByRole('dialog', { name: 'Good to know' })
    await expect(tips).toBeVisible()
    await tips.getByRole('button', { name: 'Done', exact: true }).click()

    // The template took the untouched starter workspace's place.
    await expect(board.getByRole('button', { name: 'Switch workspace' })).toContainText('Moving')
    await board.getByRole('button', { name: 'Switch workspace' }).click()
    await expect(board.getByRole('menuitem', { name: /Personal/ })).toHaveCount(0)
  })
})

test('other sites cannot reach the extension', async ({ context }) => {
  await context.route('https://elsewhere.example.org/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><meta charset="utf-8"><title>Elsewhere</title>',
    }),
  )
  const other = await context.newPage()
  await other.goto('https://elsewhere.example.org/')
  expect(await other.evaluate(() => typeof chrome.runtime?.sendMessage)).toBe('undefined')
})
