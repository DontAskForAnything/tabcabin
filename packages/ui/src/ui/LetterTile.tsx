import { cn } from '../lib/cn'
import { type TileSize, tileSizes } from './tileSizes'

export type { TileSize }

/** Calm, earthy tones that sit well next to pine (white letters, at least 5.8:1). */
const PALETTE = [
  ['#1f4a3a', '#ffffff'],
  ['#2c5f63', '#ffffff'],
  ['#3d5a73', '#ffffff'],
  ['#4f6b4a', '#ffffff'],
  ['#7a6230', '#ffffff'],
  ['#8a4b3a', '#ffffff'],
  ['#5a3d55', '#ffffff'],
  ['#5b4636', '#ffffff'],
  ['#2b2f2d', '#ffffff'],
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
        tileSizes[size],
        className,
      )}
      style={{ background: bg, color: fg }}
    >
      {letter}
    </span>
  )
}
