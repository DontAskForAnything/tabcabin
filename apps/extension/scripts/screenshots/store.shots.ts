import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect, test, type Page } from '@playwright/test'
import { ARTICLE, launch, loadDemo, openApp, openTabs } from './setup'

declare const chrome: typeof browser
declare const tabhangar: { togglePopover: (tab: object) => Promise<void> }

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../../docs/chrome-web-store')
const logo = readFileSync(resolve(here, '../../assets/logo.svg'), 'utf8').replace('STROKE', '2.1')
const fontFile = createRequire(resolve(here, '../../../../packages/ui/package.json')).resolve(
  '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
)
const font = readFileSync(fontFile).toString('base64')

test.describe.configure({ timeout: 180_000 })

test('store screenshots (1280×800)', async () => {
  mkdirSync(join(OUT, 'screenshots'), { recursive: true })
  const shot = (page: Page, name: string) =>
    page.screenshot({ path: join(OUT, 'screenshots', `${name}.png`) })

  for (const theme of ['light', 'dark'] as const) {
    const { context, worker } = await launch(1, { width: 1280, height: 800 })
    await openTabs(context, worker)
    await loadDemo(worker, theme)
    const page = await openApp(context, worker)
    await page.bringToFront()
    if (theme === 'light') {
      await shot(page, '1-board')
      await page.keyboard.press('Control+k')
      await page.keyboard.type('docs')
      await page.waitForTimeout(500)
      await shot(page, '3-search')
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Reminders' }).click()
      await page.waitForTimeout(500)
      await shot(page, '5-reminders')
      await page.keyboard.press('Escape')

      await context.route('https://journal.example.dev/**', (route) =>
        route.fulfill({ contentType: 'text/html; charset=utf-8', body: ARTICLE }),
      )
      const article = await context.newPage()
      await article.goto('https://journal.example.dev/calm-software')
      const tab = await worker.evaluate(
        async () => (await chrome.tabs.query({ url: 'https://journal.example.dev/*' }))[0]!,
      )
      await worker.evaluate((tab) => tabhangar.togglePopover(tab), tab)
      await expect(article.getByRole('dialog', { name: 'TabHangar' })).toBeVisible()
      await article.waitForTimeout(600)
      await shot(article, '4-save-popover')
    } else {
      await page.getByRole('tab', { name: 'Research' }).click()
      await page.waitForTimeout(900)
      await shot(page, '2-collections-dark')
    }
    await context.close()
  }
})

/** Renders an HTML composition at an exact pixel size. */
async function render(html: string, width: number, height: number, path: string) {
  const browser = await chromium.launch({ channel: 'chromium' })
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(html)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path })
  await browser.close()
}

const base = (body: string, width: number, height: number) => `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0 }
  body { width: ${width}px; height: ${height}px; overflow: hidden; font-family: Geist, system-ui, sans-serif;
    background: radial-gradient(120% 140% at 0% 0%, #8a7df5 0%, #5b4be0 45%, #3b2db8 100%); color: #fff; }
  .logo { display: block; filter: drop-shadow(0 12px 24px rgb(20 10 80 / .35)); }
  .logo svg { width: 100%; height: 100% }
  h1 { font-weight: 650; letter-spacing: -0.03em; line-height: 1 }
  p { color: rgb(255 255 255 / .82); letter-spacing: -0.01em; white-space: nowrap }
</style>
${body}`

test('store promo images', async () => {
  mkdirSync(OUT, { recursive: true })
  await render(
    base(
      `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 40px;gap:14px">
        <div class="logo" style="width:64px;height:64px">${logo}</div>
        <h1 style="font-size:44px">TabHangar</h1>
        <p style="font-size:19px;line-height:1.35">A calm home for your tabs, links,<br>notes and to-dos.</p>
      </div>`,
      440,
      280,
    ),
    440,
    280,
    join(OUT, 'promo-small-440x280.png'),
  )

  const board = readFileSync(
    resolve(here, '../../../../docs/screenshots/board-light.png'),
  ).toString('base64')
  await render(
    base(
      `<div style="position:absolute;left:84px;top:0;bottom:0;width:480px;display:flex;flex-direction:column;justify-content:center;gap:20px">
        <div class="logo" style="width:84px;height:84px">${logo}</div>
        <h1 style="font-size:68px">TabHangar</h1>
        <p style="font-size:26px;line-height:1.35">Boards for your tabs, links,<br>notes and to-dos.<br>Local-first, open source<br>and self-hostable.</p>
      </div>
      <img src="data:image/png;base64,${board}" style="position:absolute;left:620px;top:70px;width:960px;border-radius:18px;box-shadow:0 40px 90px -20px rgb(15 8 70 / .6), 0 0 0 1px rgb(255 255 255 / .15)">`,
      1400,
      560,
    ),
    1400,
    560,
    join(OUT, 'promo-marquee-1400x560.png'),
  )

  // Store icon: 96×96 artwork centered in 128×128 with transparent padding.
  const padded = logo.replace('viewBox="0 0 128 128"', 'viewBox="-16 -16 160 160"')
  writeFileSync(
    join(OUT, 'icon-128.png'),
    new Resvg(padded, { fitTo: { mode: 'width', value: 128 } }).render().asPng(),
  )
})

test('social preview image for the website (1200×630)', async () => {
  const board = readFileSync(
    resolve(here, '../../../../docs/screenshots/board-light.png'),
  ).toString('base64')
  await render(
    base(
      `<div style="position:absolute;left:72px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center;gap:18px">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="logo" style="width:56px;height:56px">${logo}</div>
          <span style="font-size:30px;font-weight:650;letter-spacing:-0.02em">TabHangar</span>
        </div>
        <h1 style="font-size:58px;line-height:1.04">Your tabs,<br>parked calmly</h1>
        <p style="font-size:23px;line-height:1.4;white-space:nowrap">Open-source tab manager.<br>Kanban boards, notes, reminders.<br>Self-hosted sync.</p>
      </div>
      <img src="data:image/png;base64,${board}" style="position:absolute;left:620px;top:96px;width:900px;border-radius:16px;box-shadow:0 40px 90px -20px rgb(15 8 70 / .6), 0 0 0 1px rgb(255 255 255 / .15)">`,
      1200,
      630,
    ),
    1200,
    630,
    resolve(here, '../../../landing/public/og.png'),
  )
})
