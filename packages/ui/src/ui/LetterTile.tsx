import { useState } from 'react'
import { cn } from '../lib/cn'
import { isDefaultFavicon } from './faviconDefault'

const PALETTE = [
  ['#5b4be0', '#ffffff'],
  ['#1d63ed', '#ffffff'],
  ['#12a272', '#ffffff'],
  ['#e7950f', '#ffffff'],
  ['#d93d42', '#ffffff'],
  ['#c2378f', '#ffffff'],
  ['#0f8fa3', '#ffffff'],
  ['#2b2f36', '#ffffff'],
  ['#7a5b2e', '#ffffff'],
] as const

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Deterministic colors + letter for a host/title, e.g. "github.com" → "G". */
export function letterTileFor(seed: string): { letter: string; bg: string; fg: string } {
  const clean = seed.replace(/^(https?:\/\/)?(www\.)?/i, '').trim()
  const letter = (clean.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase()
  const [bg, fg] = PALETTE[hash(clean.toLowerCase()) % PALETTE.length]!
  return { letter, bg, fg }
}

export type TileSize = 'xs' | 'sm' | 'md' | 'lg'

const sizes: Record<TileSize, string> = {
  xs: 'size-6 rounded-md text-[11px]',
  sm: 'size-7 rounded-lg text-[12px]',
  md: 'size-9 rounded-[10px] text-[14px]',
  lg: 'size-10 rounded-[11px] text-[15px]',
}

const imgSizes: Record<TileSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-[22px]',
}

export function LetterTile({
  seed,
  size = 'md',
  className,
}: {
  seed: string
  size?: TileSize
  className?: string
}) {
  const { letter, bg, fg } = letterTileFor(seed)
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center font-bold shadow-tile',
        sizes[size],
        className,
      )}
      style={{ background: bg, color: fg }}
    >
      {letter}
    </span>
  )
}

export interface FaviconProps {
  /** Image URL to try first (e.g. the browser's favicon service). */
  src?: string | null
  /** Used for the letter fallback, usually the page host. */
  seed: string
  size?: TileSize
  className?: string
}

/** Favicon in a white rounded tile; falls back to a colored letter if the image fails. */
export function Favicon({ src, seed, size = 'md', className }: FaviconProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <LetterTile seed={seed} size={size} className={className} />
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-white shadow-tile',
        sizes[size],
        className,
      )}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className={cn('object-contain', imgSizes[size])}
        onError={() => setFailed(true)}
        onLoad={(event) => {
          void isDefaultFavicon(event.currentTarget).then((generic) => generic && setFailed(true))
        }}
      />
    </span>
  )
}
