import { describe, expect, it } from 'vitest'
import { faviconTone } from './faviconTone'

/** A 16×16 icon: `paint(x, y)` gives the RGBA of each pixel. */
function icon(paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(16 * 16 * 4)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) data.set(paint(x, y), (y * 16 + x) * 4)
  return data
}

const clear = [0, 0, 0, 0] as [number, number, number, number]
const disc = (x: number, y: number) => (x - 7.5) ** 2 + (y - 7.5) ** 2 < 36

describe('faviconTone', () => {
  it('finds a white logo on a clear background', () => {
    expect(faviconTone(icon((x, y) => (disc(x, y) ? [255, 255, 255, 255] : clear)))).toBe('light')
    expect(faviconTone(icon((x, y) => (disc(x, y) ? [250, 250, 245, 160] : clear)))).toBe('light')
  })

  it('keeps dark, coloured and boxed logos as they are', () => {
    expect(faviconTone(icon((x, y) => (disc(x, y) ? [24, 23, 23, 255] : clear)))).toBe('normal')
    expect(faviconTone(icon((x, y) => (disc(x, y) ? [31, 74, 58, 255] : clear)))).toBe('normal')
    // A white square with a small dark mark still shows on the white tile.
    expect(
      faviconTone(
        icon((x, y) =>
          x > 5 && x < 10 && y > 5 && y < 10 ? [0, 0, 0, 255] : [255, 255, 255, 255],
        ),
      ),
    ).toBe('normal')
  })

  it('treats an image with next to nothing drawn as empty', () => {
    expect(faviconTone(icon(() => clear))).toBe('empty')
    expect(faviconTone(icon((x, y) => (x === 3 && y === 3 ? [0, 0, 0, 255] : clear)))).toBe('empty')
    expect(faviconTone(icon(() => [0, 0, 0, 10]))).toBe('empty')
  })
})
