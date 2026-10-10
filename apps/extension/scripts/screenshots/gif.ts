import gifenc from 'gifenc'
import { PNG } from 'pngjs'

const { applyPalette, GIFEncoder, quantize } = gifenc

/** A screencast frame and the time it was painted, in milliseconds. */
export interface Frame {
  png: Buffer
  at: number
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Encodes screencast frames as a looping GIF that plays at a steady `fps` (the delay must be
 * whole hundredths of a second, so 25 or 50). Each tick shows the latest frame painted by then.
 * All frames share one palette, so colours never shimmer, and each frame stores only the box
 * that changed, with unchanged pixels left transparent.
 */
export function encodeGif(frames: Frame[], { fps = 25, holdLastMs = 1800 } = {}): Uint8Array {
  const shown = sample(frames, 1000 / fps)
  shown.at(-1)!.delay += holdLastMs
  const pixels = new Map<Frame, Uint8Array>()
  const decode = (frame: Frame) => {
    let rgba = pixels.get(frame)
    if (!rgba) {
      rgba = PNG.sync.read(frame.png).data
      pixels.set(frame, rgba)
    }
    return rgba
  }
  const { width, height } = PNG.sync.read(frames[0]!.png)

  // One palette from frames spread over the whole animation; the last slot means "unchanged".
  const every = Math.max(1, Math.floor(shown.length / 24))
  const picked = shown.filter((_, i) => i % every === 0).map(({ frame }) => decode(frame))
  const pool = new Uint8Array(picked.length * width * height * 4)
  picked.forEach((rgba, i) => pool.set(rgba, i * width * height * 4))
  const palette = quantize(pool, 255)
  const keep = palette.length
  palette.push([0, 0, 0])

  const gif = GIFEncoder()
  let screen: Uint8Array | null = null
  let pending: { index: Uint8Array; box: Box; delay: number } | null = null
  const flush = () => {
    if (!pending) return
    const { index, box, delay } = pending
    const start = gif.bytesView().length
    gif.writeFrame(index, box.w, box.h, {
      palette: start === 0 ? palette : undefined,
      delay,
      transparent: true,
      transparentIndex: keep,
      dispose: 1,
    })
    if (start > 0) {
      // gifenc always places frames at the top left: move this one to its box. The image
      // descriptor follows the 8-byte graphic control extension.
      const bytes = gif.bytesView()
      if (bytes[start + 8] !== 0x2c) throw new Error('Unexpected GIF frame layout')
      bytes.set([box.x & 255, box.x >> 8, box.y & 255, box.y >> 8], start + 9)
    }
  }
  for (const { frame, delay } of shown) {
    const index = applyPalette(decode(frame), palette)
    pixels.delete(frame)
    const box = screen ? changed(screen, index, width, height) : { x: 0, y: 0, w: width, h: height }
    if (!box) {
      pending!.delay += delay
      continue
    }
    flush()
    pending = { index: crop(screen, index, width, box, keep), box, delay }
    screen = index
  }
  flush()
  gif.finish()
  return gif.bytes()
}

/** Picks the frame on screen at every tick; a frame that stays up longer gets a longer delay. */
function sample(frames: Frame[], tick: number) {
  const shown: { frame: Frame; delay: number }[] = []
  let next = 0
  for (let at = frames[0]!.at; at <= frames.at(-1)!.at + tick; at += tick) {
    while (next + 1 < frames.length && frames[next + 1]!.at <= at) next++
    const frame = frames[next]!
    const last = shown.at(-1)
    if (last?.frame === frame) last.delay += tick
    else shown.push({ frame, delay: tick })
  }
  return shown
}

/** The smallest box around the pixels that differ, or null when nothing changed. */
function changed(before: Uint8Array, after: Uint8Array, width: number, height: number) {
  let top = height
  let bottom = -1
  let left = width
  let right = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0, i = y * width; x < width; x++, i++) {
      if (before[i] === after[i]) continue
      if (y < top) top = y
      bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
  if (bottom < 0) return null
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

/** The box of `after`, with pixels that `before` already shows set to `keep`. */
function crop(before: Uint8Array | null, after: Uint8Array, width: number, box: Box, keep: number) {
  const out = new Uint8Array(box.w * box.h)
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = (box.y + y) * width + box.x + x
      out[y * box.w + x] = before && before[i] === after[i] ? keep : after[i]!
    }
  }
  return out
}
