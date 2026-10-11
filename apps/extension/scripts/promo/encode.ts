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
import { END_CARD, SCENE_STARTS, SYNC, VALUES } from './timeline.ts'

// Same folder as in dir.ts (kept inline: this file runs directly in Node).
const PROMO_DIR = process.env.PROMO_DIR ?? join(tmpdir(), 'tabcabin-promo')
const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '../../../landing/public')
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg'
const run = (args: string[]) => execFileSync(ffmpeg, ['-loglevel', 'error', '-y', ...args])
const FPS = 60

execFileSync(process.execPath, [
  '--experimental-strip-types',
  join(here, 'music.ts'),
  join(PROMO_DIR, 'music.wav'),
])

run([
  ...['-framerate', String(FPS), '-i', join(PROMO_DIR, 'frames/%05d.jpg')],
  ...['-i', join(PROMO_DIR, 'music.wav')],
  ...['-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p'],
  ...['-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart'],
  join(publicDir, 'promo.mp4'),
])
// The logo shot makes a good poster.
const frame = (seconds: number) =>
  join(PROMO_DIR, `frames/${String(Math.round(seconds * FPS)).padStart(5, '0')}.jpg`)
copyFileSync(frame(8.4), join(publicDir, 'promo-poster.jpg'))

// Stills for social posts and the store listing.
const scene = (i: number, seconds: number) => SCENE_STARTS[i]! + seconds
const stills: [string, number][] = [
  ['01-forty-tabs', 2.6],
  ['02-logo', 8.4],
  ['03-drag', scene(0, 2.4)],
  ['04-save-any-page', scene(1, 3.3)],
  ['05-todo', scene(2, 4.0)],
  ['06-search', scene(3, 1.8)],
  ['07-collections', scene(4, 1.8)],
  ['08-reminders', scene(5, 1.6)],
  ['09-dark', scene(6, 3.2)],
  ['10-sync', SYNC + 3.4],
  ['11-values', VALUES + 2.0],
  ['12-end', END_CARD + 2.4],
]
const docs = join(here, '../../../../docs/promo')
mkdirSync(docs, { recursive: true })
for (const [name, seconds] of stills) copyFileSync(frame(seconds), join(docs, `${name}.jpg`))
console.warn(`promo: ${join(publicDir, 'promo.mp4')}, ${stills.length} stills in docs/promo`)
