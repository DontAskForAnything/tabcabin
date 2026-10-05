import { chromium, expect, test, type Page } from '@playwright/test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CURSOR, center, glide, playSession } from '../screenshots/session'
import { ARTICLE, extensionPath, loadDemo, openApp, openTabs } from '../screenshots/setup'
import { PROMO_DIR } from './dir'

declare const chrome: typeof browser
declare const tabcabin: { togglePopover: (tab: object) => Promise<void> }

/**
 * Records the scripted tour as sharp JPEG frames (1920×1200) with timestamps and the start
 * time of every part, for the promo video renderer.
 */
test('promo footage', async () => {
  test.setTimeout(240_000)
  const dir = join(PROMO_DIR, 'footage')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const profile = mkdtempSync(join(tmpdir(), 'tabcabin-footage-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    // Screencasts capture the real window: size the window, not an emulated viewport.
    viewport: null,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--window-size=1280,944',
      '--force-device-scale-factor=1.5',
    ],
  })
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await context.addInitScript(CURSOR)
  await openTabs(context, worker)
  await loadDemo(worker, 'light')

  const frames: { file: string; t: number }[] = []
  const marks: { name: string; t: number }[] = []
  const mark = (name: string) => marks.push({ name, t: Date.now() / 1000 })
  /** Screencasts `page` into the shared frame list until the returned function is called. */
  async function record(page: Page) {
    const cdp = await context.newCDPSession(page)
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = `f${String(frames.length).padStart(5, '0')}.jpg`
      writeFileSync(join(dir, file), Buffer.from(data, 'base64'))
      frames.push({ file, t: metadata.timestamp ?? Date.now() / 1000 })
      void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined)
    })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92 })
    return async () => {
      await cdp.send('Page.stopScreencast')
      await cdp.detach()
    }
  }

  // 1. Saving an article with the popover.
  await context.route('https://journal.example.dev/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: ARTICLE }),
  )
  const article = await context.newPage()
  await article.goto('https://journal.example.dev/calm-software')
  await article.bringToFront()
  await article.mouse.move(520, 420)
  await article.waitForTimeout(800)
  let stop = await record(article)
  await article.waitForTimeout(400)
  mark('capture')
  await glide(article, 640, 330, 600)
  await article.waitForTimeout(300)
  const tab = await worker.evaluate(
    async () => (await chrome.tabs.query({ url: 'https://journal.example.dev/*' }))[0]!,
  )
  await worker.evaluate((tab) => tabcabin.togglePopover(tab), tab)
  const popover = article.getByRole('dialog', { name: 'TabCabin' })
  await expect(popover).toBeVisible()
  await article.waitForTimeout(500)
  await popover
    .getByRole('textbox')
    .pressSequentially('Share with the team on Friday', { delay: 55 })
  await article.waitForTimeout(250)
  for (const name of ['Yellow', 'Tomorrow', 'Save']) {
    const target = await center(article, popover.getByRole('button', { name, exact: true }))
    await glide(article, target.x, target.y, 450)
    await article.mouse.click(target.x, target.y)
    await article.waitForTimeout(350)
  }
  // End on the confirmation, before the popover closes itself.
  await expect(popover.getByText(/Saved to/)).toBeVisible()
  await article.waitForTimeout(500)
  mark('capture-end')
  await stop()
  await article.close()

  // 2. The tour of the new tab page, with fresh demo data.
  await loadDemo(worker, 'light')
  const page = await openApp(context, worker)
  await page.bringToFront()
  await page.mouse.move(900, 600)
  await page.waitForTimeout(800)
  stop = await record(page)
  await page.waitForTimeout(600)
  await playSession(page, mark)
  await stop()

  const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio])
  const start = frames[0]?.t ?? 0
  writeFileSync(
    join(dir, 'index.json'),
    JSON.stringify(
      {
        size,
        frames: frames.map((f) => ({ file: f.file, t: f.t - start })),
        marks: marks.map((m) => ({ name: m.name, t: m.t - start })),
      },
      null,
      1,
    ),
  )
  console.warn(
    `footage: ${frames.length} frames, viewport ${size.join('×')}`,
    marks.map((m) => `${m.name}@${(m.t - start).toFixed(1)}`).join(' '),
  )
  await context.close()
  rmSync(profile, { recursive: true, force: true })
})
