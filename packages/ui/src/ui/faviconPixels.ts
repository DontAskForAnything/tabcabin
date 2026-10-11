/** The image scaled to `size`×`size` as RGBA bytes, or null when the browser won't share them. */
export function readPixels(img: HTMLImageElement, size = 16): Uint8ClampedArray | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    return ctx.getImageData(0, 0, size, size).data
  } catch {
    // A cross-origin image without CORS taints the canvas.
    return null
  }
}

/**
 * Like `readPixels`, but when the image came from another site without permission to read it,
 * loads it once more asking for that permission (CORS). Many icon hosts allow it, GitHub's too.
 */
export async function loadPixels(img: HTMLImageElement, size = 16) {
  const own = readPixels(img, size)
  if (own) return own
  const copy = new Image()
  copy.crossOrigin = 'anonymous'
  copy.src = img.currentSrc || img.src
  try {
    await copy.decode()
  } catch {
    return null
  }
  return readPixels(copy, size)
}
