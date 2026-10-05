const TONES = {
  pine: { tile: '#1F4A3A', house: '#F4EAD5' },
  cream: { tile: '#F4EAD5', house: '#1F4A3A' },
}

/**
 * The TabCabin logo: a cabin with a chimney and three stacked tabs on a rounded tile.
 * `cream` is for pine or photo backgrounds. Same drawing as assets/logo.svg.
 */
export function CabinMark({
  size = 32,
  tone = 'pine',
}: {
  size?: number
  tone?: keyof typeof TONES
}) {
  const { tile, house } = TONES[tone]
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden className="block shrink-0">
      <rect width="128" height="128" rx="30" fill={tile} />
      <path d="M79 45 V31 a3 3 0 0 1 3 -3 H87 a3 3 0 0 1 3 3 V53 Z" fill={house} />
      <path
        d="M24 64 L64 30 L104 64"
        fill="none"
        stroke={house}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M52 77 V72 a3 3 0 0 1 3 -3 H73 a3 3 0 0 1 3 3 V77 Z" fill={house} />
      <path
        d="M47 85 V79 a4 4 0 0 1 4 -4 H77 a4 4 0 0 1 4 4 V85 Z"
        fill={house}
        stroke={tile}
        strokeWidth="3.5"
      />
      <path
        d="M42 100 V92 a8 8 0 0 1 8 -8 H78 a8 8 0 0 1 8 8 V100 Z"
        fill={house}
        stroke={tile}
        strokeWidth="3.5"
      />
      <path
        d="M34 58 V104 M94 58 V104 M28 104 H100"
        fill="none"
        stroke={house}
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  )
}
