import { chromium, test } from '@playwright/test'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROMO_DIR } from './dir'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../../..')
const fonts = createRequire(join(root, 'packages/ui/package.json'))
const font = fonts.resolve('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')
const display = fonts.resolve(
  '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
)
const FPS = 30

const files: Record<string, () => Buffer> = {
  '/promo.html': () => readFileSync(join(here, 'promo.html')),
  '/promo.js': () => readFileSync(join(here, 'promo.js')),
  '/font/geist.woff2': () => readFileSync(font),
  '/font/bricolage.woff2': () => readFileSync(display),
}
const types: Record<string, string> = {
  html: 'text/html',
  js: 'text/javascript',
  json: 'application/json',
  woff2: 'font/woff2',
  jpg: 'image/jpeg',
  png: 'image/png',
}

/**
 * Renders promo.html frame by frame (1920×1080, 30 fps) into PROMO_DIR/frames. Each frame
 * seeks the timeline explicitly, so the result does not depend on how fast the machine is.
 */
test('promo frames', async () => {
  test.setTimeout(30 * 60_000)
  const out = join(PROMO_DIR, 'frames')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })

  const browser = await chromium.launch({ channel: 'chromium' })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.route('http://promo.local/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const read =
      files[path] ??
      (path.startsWith('/footage/')
        ? () => readFileSync(join(PROMO_DIR, path))
        : path.startsWith('/shots/')
          ? () => readFileSync(join(root, 'docs/screenshots', path.slice('/shots/'.length)))
          : undefined)
    if (!read) return route.fulfill({ status: 404 })
    await route.fulfill({
      body: read(),
      contentType: types[path.split('.').pop() ?? ''] ?? 'application/octet-stream',
    })
  })
  await page.goto('http://promo.local/promo.html')
  await page.evaluate(() => (window as unknown as { ready: Promise<void> }).ready)
  const duration = await page.evaluate(() => (window as unknown as { DURATION: number }).DURATION)

  const only = process.env.PROMO_AT?.split(',').map(Number)
  const times = only ?? Array.from({ length: Math.round(duration * FPS) }, (_, i) => i / FPS)
  const cdp = await page.context().newCDPSession(page)
  for (const [i, t] of times.entries()) {
    await page.evaluate(
      (at) => (window as unknown as { seek(t: number): Promise<void> }).seek(at),
      t,
    )
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 })
    const name = only ? `at-${t.toFixed(2)}.jpg` : `${String(i).padStart(5, '0')}.jpg`
    writeFileSync(join(out, name), Buffer.from(data, 'base64'))
  }
  await browser.close()
})
