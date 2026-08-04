/**
 * Renders the extension icons from assets/logo.svg.
 * Run with: pnpm --filter @tabhangar/extension icons
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'assets/logo.svg'), 'utf8')

// Thicker strokes keep the mark readable at small sizes.
const sizes: Array<[size: number, stroke: number]> = [
  [16, 3],
  [32, 2.6],
  [48, 2.3],
  [128, 2.1],
]

mkdirSync(resolve(root, 'public/icon'), { recursive: true })
for (const [size, stroke] of sizes) {
  const svg = source.replace('STROKE', String(stroke))
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(resolve(root, `public/icon/${size}.png`), png)
}
console.warn(`Rendered ${sizes.length} icons`)
