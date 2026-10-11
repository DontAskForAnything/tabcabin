import { readPixels } from './faviconPixels'

/**
 * The browser's favicon service returns a generic globe for pages it has never seen.
 * We render that reference image once and compare pixels, so unknown sites can use a letter tile instead.
 */
let reference: Promise<string | null> | null = null

function fingerprint(img: HTMLImageElement): string | null {
  const data = readPixels(img)
  if (!data) return null
  let hash = 0
  for (let i = 0; i < data.length; i += 4)
    hash = (hash * 31 + data[i]! + data[i + 1]! * 7 + data[i + 2]! * 13 + data[i + 3]!) | 0
  return String(hash)
}

function loadFingerprint(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(fingerprint(img))
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** True when `img` shows the generic globe served for unknown pages by `serviceUrl`'s origin. */
export async function isDefaultFavicon(img: HTMLImageElement): Promise<boolean> {
  const src = img.currentSrc || img.src
  const match = /^(.*\/_favicon\/)\?/.exec(src)
  if (!match) return false
  if (!reference) {
    const probe = new URL(match[1]!)
    probe.searchParams.set('pageUrl', 'https://unknown-site.invalid/')
    probe.searchParams.set('size', '64')
    reference = loadFingerprint(probe.toString())
  }
  const [ref, own] = await Promise.all([reference, Promise.resolve(fingerprint(img))])
  return ref !== null && own === ref
}
