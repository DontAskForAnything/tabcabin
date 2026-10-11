/**
 * How a favicon reads on the white tile: `empty` when next to nothing is drawn, `light` when what
 * is drawn hardly shows on white (a white logo meant for dark browser tabs, like GitHub's when the
 * system is dark), otherwise `normal`.
 */
export type FaviconTone = 'normal' | 'light' | 'empty'

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** `rgba` holds 4 bytes per pixel, as `ImageData.data` does. */
export function faviconTone(rgba: ArrayLike<number>): FaviconTone {
  const pixels = rgba.length / 4
  let drawn = 0
  let showing = 0
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3]! / 255
    if (alpha < 0.12) continue
    drawn++
    // The pixel laid over white; it shows when its contrast with white is at least 1.4:1.
    const [r, g, b] = [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!].map((c) =>
      channel(c * alpha + 255 * (1 - alpha)),
    ) as [number, number, number]
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (1.05 / (luminance + 0.05) >= 1.4) showing++
  }
  if (drawn < pixels * 0.02) return 'empty'
  if (showing < drawn * 0.04) return 'light'
  return 'normal'
}
