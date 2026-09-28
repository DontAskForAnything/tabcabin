import { cn } from '../lib/cn'
import { type TileSize, tileSizes } from './tileSizes'

export type { TileSize }

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
