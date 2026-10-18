import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { type BrowserContext, type Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { openBoard, startSyncServer, type SyncServer } from './syncServer'

declare const tabcabin: {
  db: {
    meta: {
      put(row: object): Promise<unknown>
      get(key: string): Promise<{ value: unknown } | undefined>
    }
  }
}

const DAY = 86_400_000

/** A stand-in for the developer's Discord webhook that keeps what it was sent. */
let discord: Server
let posts: Record<string, unknown>[] = []
let server: SyncServer | undefined
let webhook = ''

test.beforeAll(async () => {
  discord = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk: Buffer) => (body += chunk.toString()))
    req.on('end', () => {
      posts.push(JSON.parse(body) as Record<string, unknown>)
      res.writeHead(204).end()
    })
  })
  await new Promise<void>((done) => discord.listen(0, '127.0.0.1', done))
  webhook = `http://127.0.0.1:${(discord.address() as AddressInfo).port}/api/webhooks/1/secret`
  server = await startSyncServer({ FEEDBACK_WEBHOOK_URL: webhook })
})

test.afterAll(() => {
  server?.stop()
  discord?.close()
})

test.beforeEach(() => {
  posts = []
})

async function worker(context: BrowserContext) {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
}

/** Two weeks and five days of use behind this browser, or a "Not now" that is due again. */
async function questionDue(context: BrowserContext, state: 'waiting' | 'later' = 'waiting') {
  await (
    await worker(context)
  ).evaluate(
    ({ state, now, day }) =>
      tabcabin.db.meta.put({
        key: 'feedback.ask',
        value: {
          since: now - 15 * day,
          daysUsed: 5,
          lastDay: '2026-01-01',
          state,
          ...(state === 'later' ? { askAgainAt: now - day } : {}),
        },
      }),
    { state, now: Date.now(), day: DAY },
  )
}

async function askState(context: BrowserContext) {
  return (await worker(context)).evaluate(
    async () => ((await tabcabin.db.meta.get('feedback.ask'))?.value as { state: string }).state,
  )
}

const card = (page: Page) => page.getByRole('region', { name: 'How is TabCabin working for you?' })

test('sends feedback from the menu to the developer’s Discord', async ({ context }) => {
  const page = await openBoard(context, server!.url)
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Send feedback' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tell me what to improve' })
  await expect(dialog).toContainText('Nothing from your boards')
  await expect(dialog.getByRole('button', { name: 'Send' })).toBeDisabled()
  await dialog.getByLabel('Message').fill('Moving a group to another workspace needs a shortcut.')
  await dialog.getByLabel(/Email, if you’d like an answer/).fill('ola@example.com')
  await expect(dialog).toContainText('53 / 2000')
  await dialog.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText('Sent. Thank you for the feedback.')).toBeVisible()
  await expect(dialog).toBeHidden()
  await expect.poll(() => posts.length).toBe(1)
  expect(posts[0]).toMatchObject({
    allowed_mentions: { parse: [] },
    embeds: [
      {
        description: 'Moving a group to another workspace needs a shortcut.',
        fields: [{ name: 'Reply to', value: 'ola@example.com' }],
        footer: { text: expect.stringMatching(/^TabCabin \d+\.\d+\.\d+ · en$/) as unknown },
      },
    ],
  })
  // Whoever wrote once is not asked again.
  expect(await askState(context)).toBe('done')
})

test('asks once after two weeks of use, and once more a month after “Not now”', async ({
  context,
}) => {
  await questionDue(context)
  const page = await openBoard(context, server!.url)
  await expect(card(page)).toContainText('You’ve used it for two weeks.')
  await card(page).getByRole('button', { name: 'Not now' }).click()
  await expect(card(page)).toBeHidden()
  expect(await askState(context)).toBe('later')

  // A month later it comes back once; closing the form it opened ends the question.
  await questionDue(context, 'later')
  await page.reload()
  await expect(card(page)).toContainText('Every rating and every note helps a lot.')
  await expect(card(page)).not.toContainText('two weeks')
  await card(page).getByRole('button', { name: 'Tell me what to improve' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tell me what to improve' })
  await expect(dialog).toBeVisible()
  await expect(card(page)).toBeHidden()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => askState(context)).toBe('done')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await page.waitForTimeout(500)
  await expect(card(page)).toBeHidden()
  expect(posts).toHaveLength(0)
})

test('rating opens the store’s reviews and ends the question', async ({ context, extensionId }) => {
  await questionDue(context)
  const page = await openBoard(context, server!.url)
  const rate = card(page).getByRole('link', { name: 'Rate in the Chrome Web Store' })
  await expect(rate).toHaveAttribute(
    'href',
    `https://chromewebstore.google.com/detail/${extensionId}/reviews`,
  )
  await expect(rate).toHaveAttribute('target', '_blank')
  // Stay off the real store (Chromium keeps its pages to itself); the click still counts.
  await page.evaluate(() =>
    document.addEventListener('click', (event) => event.preventDefault(), { capture: true }),
  )
  await rate.click()
  await expect(card(page)).toBeHidden()
  expect(await askState(context)).toBe('done')
})

test('a server without the form says so; a build without a server only offers the rating', async ({
  context,
  extensionId,
}) => {
  const plain = await startSyncServer()
  try {
    const page = await openBoard(context, plain.url)
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Send feedback' }).click()
    const dialog = page.getByRole('dialog', { name: 'Tell me what to improve' })
    await expect(dialog).toContainText('This sync server doesn’t take feedback.')
    await expect(dialog.getByRole('button', { name: 'Send' })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Close' }).first().click()
    await page.close()
  } finally {
    plain.stop()
  }

  // The offline build (no sync server): no form anywhere, the card keeps the rating.
  await (
    await worker(context)
  ).evaluate(() => tabcabin.db.meta.put({ key: 'test.syncServer', value: null }))
  await questionDue(context)
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(card(page).getByRole('link', { name: 'Rate in the Chrome Web Store' })).toBeVisible()
  await expect(card(page).getByRole('button', { name: 'Tell me what to improve' })).toHaveCount(0)
  await page.getByRole('button', { name: 'More' }).click()
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Send feedback' })).toHaveCount(0)
})
