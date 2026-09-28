import { useState } from 'react'
import { cn } from '../lib/cn'
import { isDefaultFavicon } from './faviconDefault'
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

/**
 * Favicon in a white rounded tile. Moves to the next source when an image fails or is the
 * browser's generic globe, and ends with a colored letter.
 */
export function Favicon({ src, seed, size = 'md', className }: FaviconProps) {
  const sources = (Array.isArray(src) ? src : [src]).filter((s): s is string => !!s)
  const key = sources.join('\n')
  const [state, setState] = useState({ key, index: 0 })
  const index = state.key === key ? state.index : 0
  const current = sources[index]
  const next = () => setState({ key, index: index + 1 })
  if (!current) return <LetterTile seed={seed} size={size} className={className} />
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-white shadow-tile',
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
          void isDefaultFavicon(event.currentTarget).then((generic) => generic && next())
        }}
      />
    </span>
  )
}
