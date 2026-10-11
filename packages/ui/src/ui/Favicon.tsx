import { useState } from 'react'
import { cn } from '../lib/cn'
import { isDefaultFavicon } from './faviconDefault'
import { loadPixels } from './faviconPixels'
import { faviconTone } from './faviconTone'
import { LetterTile } from './LetterTile'
import { type TileSize, tileImageSizes, tileSizes } from './tileSizes'

export interface FaviconProps {
  /** Image URLs tried in order (e.g. the browser's favicon service, then the page's own icon). */
  src?: string | null | readonly (string | null | undefined)[]
  /** Used for the letter fallback, usually the page host. */
  seed: string
  size?: TileSize
  className?: string
}

/** Behind logos that are white or nearly so: the darkest of the letter tile tones. */
const DARK_TILE = 'bg-[#2b2f2d]'

/**
 * Favicon in a white rounded tile, or a dark one when the logo is white. Moves to the next source
 * when an image fails, is empty or is the browser's generic globe, and ends with a colored letter.
 */
export function Favicon({ src, seed, size = 'md', className }: FaviconProps) {
  const sources = (Array.isArray(src) ? src : [src]).filter((s): s is string => !!s)
  const key = sources.join('\n')
  const [state, setState] = useState({ key, index: 0, light: false })
  const { index, light } = state.key === key ? state : { index: 0, light: false }
  const current = sources[index]
  // A step only applies while the image it is about is still the one shown.
  const update = (change: { index?: number; light: boolean }) =>
    setState((s) => {
      const shown = s.key === key ? s : { key, index: 0, light: false }
      return shown.index === index ? { ...shown, ...change } : s
    })
  const next = () => update({ index: index + 1, light: false })
  const lighten = () => update({ light: true })
  if (!current) return <LetterTile seed={seed} size={size} className={className} />
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center shadow-tile',
        light ? DARK_TILE : 'bg-white',
        tileSizes[size],
        className,
      )}
    >
      <img
        key={current}
        src={current}
        alt=""
        draggable={false}
        className={cn('object-contain', tileImageSizes[size])}
        onError={next}
        onLoad={(event) => {
          const img = event.currentTarget
          void Promise.all([loadPixels(img), isDefaultFavicon(img)]).then(([pixels, generic]) => {
            const tone = pixels ? faviconTone(pixels) : 'normal'
            if (generic || tone === 'empty') next()
            else if (tone === 'light') lighten()
          })
        }}
      />
    </span>
  )
}
