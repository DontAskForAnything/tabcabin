import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect, test, type Page } from '@playwright/test'
import { ARTICLE, launch, loadDemo, openApp, openTabs } from './setup'

declare const chrome: typeof browser
declare const tabcabin: { togglePopover: (tab: object) => Promise<void> }

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../../docs/chrome-web-store')
const logo = readFileSync(resolve(here, '../../assets/logo.svg'), 'utf8')
const creamLogo = readFileSync(resolve(here, '../../../../docs/brand/logo-cream.svg'), 'utf8')
const fonts = createRequire(resolve(here, '../../../../packages/ui/package.json'))
const font = readFileSync(
  fonts.resolve('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'),
).toString('base64')
const display = readFileSync(
  fonts.resolve(
    '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  ),
).toString('base64')

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
      await worker.evaluate((tab) => tabcabin.togglePopover(tab), tab)
      await expect(article.getByRole('dialog', { name: 'TabCabin' })).toBeVisible()
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

/** Pine with cream type for the store tiles, cream with ink type for the social preview. */
const THEMES = {
  pine: {
    background: 'radial-gradient(120% 140% at 0% 0%, #2a5f4a 0%, #1f4a3a 50%, #173a2e 100%)',
    text: '#f4ead5',
    soft: 'rgb(244 234 213 / .8)',
    shadow: 'rgb(4 20 14 / .55)',
  },
  cream: {
    background: 'radial-gradient(120% 140% at 0% 0%, #faf6ee 0%, #f4ead5 60%, #ede0c5 100%)',
    text: '#0f1110',
    soft: '#4a504c',
    shadow: 'rgb(60 45 20 / .28)',
  },
}

const base = (
  body: string,
  width: number,
  height: number,
  theme: keyof typeof THEMES = 'pine',
) => `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: Geist; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }
  @font-face { font-family: Bricolage; src: url(data:font/woff2;base64,${display}) format('woff2'); font-weight: 200 800; }
  * { box-sizing: border-box; margin: 0 }
  body { width: ${width}px; height: ${height}px; overflow: hidden; font-family: Geist, system-ui, sans-serif;
    background: ${THEMES[theme].background}; color: ${THEMES[theme].text}; }
  .logo { display: block; filter: drop-shadow(0 12px 24px ${THEMES[theme].shadow}); }
  .logo svg { width: 100%; height: 100% }
  h1, .wordmark { font-family: Bricolage, Geist, sans-serif; font-weight: 700; letter-spacing: -0.03em; line-height: 1 }
  p { color: ${THEMES[theme].soft}; letter-spacing: -0.01em; white-space: nowrap }
  .shot { position: absolute; border-radius: 16px; box-shadow: 0 40px 90px -20px ${THEMES[theme].shadow}, 0 0 0 1px rgb(15 17 16 / .08) }
</style>
${body}`

test('store promo images', async () => {
  mkdirSync(OUT, { recursive: true })
  await render(
    base(
      `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 40px;gap:14px">
        <div class="logo" style="width:64px;height:64px">${creamLogo}</div>
        <h1 style="font-size:46px">TabCabin</h1>
        <p style="font-size:19px;line-height:1.35">A calm cabin for your tabs,<br>links, notes and to-dos.</p>
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
        <div class="logo" style="width:84px;height:84px">${creamLogo}</div>
        <h1 style="font-size:72px">TabCabin</h1>
        <p style="font-size:26px;line-height:1.35">A calm cabin for your tabs.<br>Boards for links, notes<br>and to-dos in every new tab.<br>Private, works offline.</p>
      </div>
      <img class="shot" src="data:image/png;base64,${board}" style="left:620px;top:70px;width:960px;border-radius:18px">`,
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
      `<div style="position:absolute;left:72px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center;gap:20px">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="logo" style="width:56px;height:56px">${logo}</div>
          <span class="wordmark" style="font-size:34px">TabCabin</span>
        </div>
        <h1 style="font-size:62px;line-height:1.02">A <span style="color:#1f4a3a">calm</span> cabin<br>for your tabs</h1>
        <p style="font-size:23px;line-height:1.4;white-space:nowrap">Open-source tab manager.<br>Boards, notes and reminders.<br>Self-hosted sync.</p>
      </div>
      <img class="shot" src="data:image/png;base64,${board}" style="left:620px;top:96px;width:900px">`,
      1200,
      630,
      'cream',
    ),
    1200,
    630,
    resolve(here, '../../../landing/public/og.png'),
  )
})
