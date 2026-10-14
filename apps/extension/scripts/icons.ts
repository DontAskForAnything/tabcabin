/**
 * Renders the extension icons and the website favicons from assets/logo.svg (and logo-small.svg
 * for 16 px, a bolder drawing with two tabs that stays readable in the toolbar).
 * Run with: pnpm --filter @tabcabin/extension icons
 */
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { ico } from './ico.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (file: string) => readFileSync(resolve(root, 'assets', file), 'utf8')
// A small transparent margin around the tile, like other toolbar icons.
const withMargin = (svg: string) => svg.replace('viewBox="0 0 128 128"', 'viewBox="-4 -4 136 136"')

const icons: Array<[size: number, svg: string]> = [
  [16, read('logo-small.svg')],
  [32, withMargin(read('logo.svg'))],
  [48, withMargin(read('logo.svg'))],
  [128, withMargin(read('logo.svg'))],
]

const png = (svg: string, size: number) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
const render = (svg: string, size: number, file: string) => writeFileSync(file, png(svg, size))

mkdirSync(resolve(root, 'public/icon'), { recursive: true })
for (const [size, svg] of icons) render(svg, size, resolve(root, `public/icon/${size}.png`))

// Website: the small drawing for browser tabs, a square full-bleed tile for iOS home screens.
// Google shows PNG or ICO favicons in search results (not SVG) and asks for more than 48 px.
const site = resolve(root, '../landing/public')
copyFileSync(resolve(root, 'assets/logo-small.svg'), resolve(site, 'favicon.svg'))
render(read('logo.svg'), 32, resolve(site, 'favicon-32.png'))
render(read('logo-small.svg'), 96, resolve(site, 'favicon-96.png'))
render(read('logo.svg').replace('rx="30"', 'rx="0"'), 180, resolve(site, 'apple-touch-icon.png'))
const favicon: Array<[size: number, png: Buffer]> = [
  [16, png(read('logo-small.svg'), 16)],
  [32, png(read('logo.svg'), 32)],
  [48, png(read('logo.svg'), 48)],
]
writeFileSync(resolve(site, 'favicon.ico'), ico(favicon))

// Android home screens (site.webmanifest) and the logo in search data. The maskable one is a
// full-bleed tile with the house inside the circle that Android may cut it to.
render(read('logo.svg'), 192, resolve(site, 'icon-192.png'))
render(read('logo.svg'), 512, resolve(site, 'icon-512.png'))
const maskable = read('logo.svg')
  .replace('viewBox="0 0 128 128"', 'viewBox="-16 -16 160 160"')
  .replace(
    '<rect width="128" height="128" rx="30"',
    '<rect x="-16" y="-16" width="160" height="160"',
  )
render(maskable, 512, resolve(site, 'icon-maskable-512.png'))
console.warn(`Rendered ${icons.length} icons and the site favicons`)
