/**
 * Synthesizes the soundtrack and joins it with the rendered frames into the promo video, plus a
 * poster image. Needs ffmpeg with libx264 (on PATH, or set FFMPEG=/path/to/ffmpeg).
 *
 * Run: node --experimental-strip-types scripts/promo/encode.ts
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Same folder as in dir.ts (kept inline: this file runs directly in Node).
const PROMO_DIR = process.env.PROMO_DIR ?? join(tmpdir(), 'tabhangar-promo')
const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '../../../landing/public')
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const run = (args: string[]) => execFileSync(ffmpeg, ['-loglevel', 'error', '-y', ...args])

execFileSync(process.execPath, [
  '--experimental-strip-types',
  join(here, 'music.ts'),
  join(PROMO_DIR, 'music.wav'),
])

run([
  ...['-framerate', '30', '-i', join(PROMO_DIR, 'frames/%05d.jpg')],
  ...['-i', join(PROMO_DIR, 'music.wav')],
  ...['-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p'],
  ...['-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart'],
  join(publicDir, 'promo.mp4'),
])
// The logo shot makes a good poster.
const frame = (seconds: number) =>
  join(PROMO_DIR, `frames/${String(Math.round(seconds * 30)).padStart(5, '0')}.jpg`)
copyFileSync(frame(6.6), join(publicDir, 'promo-poster.jpg'))

// Stills for social posts and the store listing.
const stills: [string, number][] = [
  ['01-forty-tabs', 2.6],
  ['02-logo', 6.6],
  ['03-drag', 9.6],
  ['04-save-any-page', 13.9],
  ['05-todo', 19.2],
  ['06-search', 23.8],
  ['07-collections', 29.6],
  ['08-reminders', 33.8],
  ['09-dark', 40.4],
  ['10-sync', 44.2],
  ['11-values', 47.6],
  ['12-end', 50.4],
]
const docs = join(here, '../../../../docs/promo')
mkdirSync(docs, { recursive: true })
for (const [name, seconds] of stills) copyFileSync(frame(seconds), join(docs, `${name}.jpg`))
console.warn(`promo: ${join(publicDir, 'promo.mp4')}, ${stills.length} stills in docs/promo`)
