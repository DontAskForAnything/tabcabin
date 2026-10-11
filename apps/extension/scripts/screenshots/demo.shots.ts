import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, expect, test, type Page } from '@playwright/test'
import { encodeGif, type Frame } from './gif'
import { CURSOR, addTodo, dragTab, glide, openCollections, search, setPace } from './session'
import { extensionPath, loadDemo, openApp, openTabs, OUT } from './setup'
import { slowAnimations, slowDown } from './slow-motion'

const FPS = 25
/** The tour runs this many times slower while recording (see `slow-motion.ts`). */
const SLOW = 4

/**
 * Screencasts `page` into `frames` until the returned function is called. Chrome sends a frame
 * whenever the page paints; times are scripted milliseconds, and only the last frame painted in
 * each GIF frame's slot is kept.
 */
async function record(page: Page, frames: Frame[]) {
  const cdp = await page.context().newCDPSession(page)
  const slot = 1000 / FPS
  let start: number | null = null
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const now = (metadata.timestamp ?? Date.now() / 1000) * 1000
    start ??= now
    const frame = { png: Buffer.from(data, 'base64'), at: (now - start) / SLOW }
    const last = frames.at(-1)
    if (last && Math.ceil(last.at / slot) === Math.ceil(frame.at / slot)) frames.pop()
    frames.push(frame)
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined)
  })
  await cdp.send('Page.startScreencast', { format: 'png' })
  return async () => {
    await cdp.send('Page.stopScreencast')
    await cdp.detach()
  }
}

/** The start of the scripted tour (drag a tab, add a to-do, search, collections) as a GIF. */
test('demo animation', async () => {
  test.setTimeout(300_000)
  const profile = mkdtempSync(join(tmpdir(), 'tabcabin-shots-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    // Screencasts capture the real window, so size the window: this one holds a 1440×900 page
    // drawn at 2/3 scale (960×600 pixels).
    viewport: null,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--window-size=1437,1041',
      '--force-device-scale-factor=0.6666667',
    ],
  })
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  await context.addInitScript(CURSOR)
  await openTabs(context, worker)
  await loadDemo(worker, 'light')
  await slowDown(context, SLOW)
  const page = await openApp(context, worker)
  await page.bringToFront()
  expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([1440, 900])
  await slowAnimations(page, SLOW)
  await glide(page, 900, 600)
  await page.waitForTimeout(800)

  const frames: Frame[] = []
  const stop = await record(page, frames)
  try {
    await page.waitForTimeout(600 * SLOW)
    await dragTab(page)
    await addTodo(page)
    await search(page)
    await openCollections(page)
  } finally {
    await stop()
    setPace(1)
  }

  writeFileSync(join(OUT, 'demo.gif'), encodeGif(frames, { fps: FPS, holdLastMs: 800 }))
  await context.close()
  rmSync(profile, { recursive: true, force: true })
})
