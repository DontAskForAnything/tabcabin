import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'

/** Renders the logo + wordmark lockups in docs/brand (run `pnpm brand`). */
const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../../docs/brand')
const fontFile = createRequire(resolve(here, '../../../../packages/ui/package.json')).resolve(
  '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2',
)
const font = readFileSync(fontFile).toString('base64')
const mark = (file: string) => readFileSync(join(OUT, file), 'utf8')

const lockups = [
  {
    name: 'lockup-light',
    background: '#F4EAD5',
    text: '#0F1110',
    tagline: '#5D635F',
    logo: 'logo.svg',
  },
  {
    name: 'lockup-dark',
    background: '#0F1110',
    text: '#F2F4F2',
    tagline: '#9AA29C',
    logo: 'logo.svg',
  },
  {
    name: 'lockup-pine',
    background: '#1F4A3A',
    text: '#F4EAD5',
    tagline: '#C9D8CF',
    logo: 'logo-cream.svg',
  },
]

for (const lockup of lockups) {
  test(lockup.name, async ({ browser }) => {
    const page = await browser.newPage({
      viewport: { width: 960, height: 320 },
      deviceScaleFactor: 2,
    })
    await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: Bricolage; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 800; }
  * { margin: 0 }
  body { height: 320px; display: flex; align-items: center; justify-content: center; gap: 36px;
    background: ${lockup.background}; font-family: Bricolage, sans-serif; }
  svg { width: 148px; height: 148px; display: block }
  h1 { font-size: 104px; font-weight: 700; letter-spacing: -0.025em; line-height: 0.9; color: ${lockup.text} }
  p { margin-top: 14px; font-size: 30px; font-weight: 500; letter-spacing: -0.01em; color: ${lockup.tagline} }
</style>
${mark(lockup.logo)}<div><h1>TabCabin</h1><p>A quiet cabin for your tabs.</p></div>`)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: join(OUT, `${lockup.name}.png`) })
  })
}
