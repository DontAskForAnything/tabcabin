import { displayHost, el } from './dom'
import type { SharedItem } from './load'

/** The app's letter tile tones (white letters on calm, earthy colors). */
const TONES = [
  '#1f4a3a',
  '#2c5f63',
  '#3d5a73',
  '#4f6b4a',
  '#7a6230',
  '#8a4b3a',
  '#5a3d55',
  '#5b4636',
  '#2b2f2d',
]

function letterFor(seed: string): { letter: string; tone: string } {
  const clean = seed.replace(/^(https?:\/\/)?(www\.)?/i, '').trim()
  let hash = 0
  for (const char of clean.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return {
    letter: (clean.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase(),
    tone: TONES[Math.abs(hash) % TONES.length]!,
  }
}

/** Where a site's icon may be: the icon its tab had, then the usual /favicon.ico. */
function iconSources(item: SharedItem): string[] {
  if (!item.url || !/^https?:\/\//i.test(item.url)) return []
  let host: string
  try {
    host = new URL(item.url).host
  } catch {
    return []
  }
  const saved = item.favIconUrl?.startsWith('https://') ? [item.favIconUrl] : []
  return [...saved, `https://${host}/favicon.ico`]
}

/**
 * The site's icon in a white tile, as in the app. A colored letter shows first and stays when no
 * icon loads; the icon comes straight from the site.
 */
export function siteTile(item: SharedItem): HTMLElement {
  const { letter, tone } = letterFor(item.url ? displayHost(item.url) : item.title)
  const tile = el(
    'span',
    'flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-bold text-white',
    letter,
  )
  tile.style.background = tone
  tile.ariaHidden = 'true'
  const sources = iconSources(item)
  const next = () => {
    const src = sources.shift()
    if (!src) return
    const img = new Image()
    img.alt = ''
    img.referrerPolicy = 'no-referrer'
    img.className = 'size-5 object-contain'
    img.onload = () => {
      if (!img.naturalWidth) return next()
      tile.className =
        'flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-tile'
      tile.style.background = ''
      tile.replaceChildren(img)
    }
    img.onerror = next
    img.src = src
  }
  next()
  return tile
}
