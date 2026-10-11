import { chromium, test, type Page } from '@playwright/test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CURSOR, glide, setPace, wait } from '../screenshots/session'
import { ARTICLE, extensionPath, loadDemo, openApp, openTabs } from '../screenshots/setup'
import { slowAnimations, slowDown } from '../screenshots/slow-motion'
import { PROMO_DIR } from './dir'
import { playTour, savePage } from './tour'

const FPS = 60
/**
 * The tour runs this many times slower while recording (see `slow-motion.ts`): 16 on a small
 * 2-core box; a fast machine may need less (PROMO_SLOW). Every slot of a drag must get a frame.
 */
const SLOW = Number(process.env.PROMO_SLOW ?? 16)

/**
 * Records the scripted tour as sharp JPEG frames (1920×1200, 60 fps) with timestamps and the
 * start time of every part, for the promo video renderer. Times are scripted seconds.
 */
test('promo footage', async () => {
  test.setTimeout(30 * 60_000)
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
  let start: number | null = null
  /** Scripted seconds since the first frame, from a real time in seconds. */
  const scripted = (seconds: number) => (seconds - (start ??= seconds)) / SLOW
  const mark = (name: string) => marks.push({ name, t: scripted(Date.now() / 1000) })
  /**
   * Screencasts `page` into the shared frame list until the returned function is called. Chrome
   * sends a frame whenever the page paints; only the last one painted in each film frame's slot
   * is kept. Frames are timed when they arrive: their own timestamps sometimes go backwards.
   */
  async function record(page: Page) {
    const cdp = await context.newCDPSession(page)
    let held: { data: string; t: number } | null = null
    const keep = () => {
      if (!held) return
      const file = `f${String(frames.length).padStart(5, '0')}.jpg`
      writeFileSync(join(dir, file), Buffer.from(held.data, 'base64'))
      frames.push({ file, t: held.t })
      held = null
    }
    cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
      const t = scripted(Date.now() / 1000)
      if (held && Math.ceil(held.t * FPS) !== Math.ceil(t * FPS)) keep()
      held = { data, t }
      void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined)
    })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92 })
    return async () => {
      await cdp.send('Page.stopScreencast')
      keep()
      await cdp.detach()
    }
  }

  await slowDown(context, SLOW)
  try {
    // 1. Saving an article with the popover.
    await context.route('https://journal.example.dev/**', (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: ARTICLE }),
    )
    const article = await context.newPage()
    await article.goto('https://journal.example.dev/calm-software')
    await article.bringToFront()
    await slowAnimations(article, SLOW)
    await glide(article, 520, 420)
    await wait(article, 800)
    let stop = await record(article)
    await wait(article, 400)
    mark('capture')
    await savePage(article, worker)
    mark('capture-end')
    await stop()
    await article.close()

    // 2. The tour of the new tab page, with fresh demo data.
    await loadDemo(worker, 'light')
    const page = await openApp(context, worker)
    await page.bringToFront()
    await slowAnimations(page, SLOW)
    await glide(page, 900, 600)
    await wait(page, 800)
    stop = await record(page)
    await wait(page, 600)
    await playTour(page, mark)
    await stop()

    const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio])
    writeFileSync(join(dir, 'index.json'), JSON.stringify({ size, frames, marks }, null, 1))
    console.warn(
      `footage: ${frames.length} frames, viewport ${size.join('×')}`,
      marks.map((m) => `${m.name}@${m.t.toFixed(2)}`).join(' '),
    )
  } finally {
    setPace(1)
    await context.close()
    rmSync(profile, { recursive: true, force: true })
  }
})
