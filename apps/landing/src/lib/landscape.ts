/**
 * Build-time helpers for the forest drawings (hero valley, etching, 404). Everything is seeded,
 * so the same trees grow on every build and no drawing code ships to the browser.
 */

export type Rand = () => number
export type Ground = (x: number) => number

/** Park–Miller generator: a small, repeatable stream of numbers in [0, 1). */
export function seeded(seed: number): Rand {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/** Drawings use whole units: nobody sees the difference and the page stays small. */
export const round = (n: number) => String(Math.round(n))

/**
 * A gently rolling ground line. `pin` flattens it around one point, so a cabin can stand level.
 */
export function ridge(options: {
  base: number
  amp: number
  phase: number
  pin?: { x: number; y: number; reach: number }
}): Ground {
  const { base, amp, phase, pin } = options
  return (x) => {
    let y =
      base +
      amp *
        (Math.sin(x * 0.0061 + phase) * 0.55 +
          Math.sin(x * 0.017 + phase * 2.3) * 0.3 +
          Math.sin(x * 0.043 + phase * 4.1) * 0.15)
    if (pin) {
      const distance = Math.abs(x - pin.x)
      if (distance < pin.reach) {
        const weight = (Math.cos((distance / pin.reach) * Math.PI) + 1) / 2
        y = y * (1 - weight) + pin.y * weight
      }
    }
    return y
  }
}

/** A spruce with three drooping tiers and a short trunk, drawn clockwise like the ground. */
export function spruce(cx: number, ground: number, height: number, width: number): string {
  const tiers = [
    [-0.5, 0.1],
    [-0.2, 0.36],
    [-0.38, 0.34],
    [-0.13, 0.62],
    [-0.26, 0.6],
    [0, 1],
    [0.26, 0.6],
    [0.13, 0.62],
    [0.38, 0.34],
    [0.2, 0.36],
    [0.5, 0.1],
    [0.05, 0.1],
  ] as const
  const outline = tiers.map(
    ([dx, dy]) => `${round(cx + dx * width)} ${round(ground - dy * height)}`,
  )
  const trunk = 0.05 * width
  return (
    `M${outline.join('L')}` +
    `L${round(cx + trunk)} ${round(ground + 4)}L${round(cx - trunk)} ${round(ground + 4)}` +
    `L${round(cx - trunk)} ${round(ground - 0.1 * height)}Z`
  )
}

/** The area under a ground line, down to `bottom`, from `from` to 60 units past `width`. */
export function land(y: Ground, width: number, bottom: number, from = -60): string {
  let d = `M${from} ${round(y(from))}`
  for (let x = from + 8; x <= width + 60; x += 8) d += `L${x} ${round(y(x))}`
  return `${d}L${width + 60} ${bottom}L${from} ${bottom}Z`
}

/** A row of spruces standing on a ground line, optionally with the ground itself. */
export function forest(options: {
  width: number
  bottom: number
  y: Ground
  rand: Rand
  gap: number
  min: number
  max: number
  from?: number
  to?: number
  skip?: (x: number) => boolean
  ground?: boolean
}): string {
  const { width, bottom, y, rand, gap, min, max, skip } = options
  const { from = -30, to = width + 30, ground = true } = options
  let d = ground ? land(y, width, bottom) : ''
  let x = from + rand() * gap
  while (x < to) {
    if (!skip?.(x)) {
      const height = min + rand() * (max - min)
      d += spruce(x, y(x) + 3, height, height * (0.4 + rand() * 0.12))
    }
    x += gap * (0.5 + rand() * 0.8)
  }
  return d
}

/** A jagged mountain range through the given peaks and saddles. */
export function mountains(points: [number, number][], bottom: number, rand: Rand): string {
  const [first] = points
  const last = points[points.length - 1]
  if (!first || !last) return ''
  let d = `M${first[0]} ${first[1]}`
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!
    const [x1, y1] = points[i]!
    for (let step = 1; step <= 3; step++) {
      const t = step / 3
      const jitter = step < 3 ? (rand() - 0.5) * 10 : 0
      d += `L${round(x0 + (x1 - x0) * t)} ${round(y0 + (y1 - y0) * t + jitter)}`
    }
  }
  return `${d}L${last[0]} ${bottom}L${first[0]} ${bottom}Z`
}

/** Scattered stars: [x, y, radius, twinkle delay, twinkle duration]. */
export function stars(
  rand: Rand,
  count: number,
  box: { x: number; y: number; width: number; height: number },
) {
  return Array.from({ length: count }, () => {
    const radius = rand() < 0.12 ? 1.6 : 0.6 + rand() * 0.7
    return {
      x: round(box.x + rand() * box.width),
      y: round(box.y + Math.pow(rand(), 1.4) * box.height),
      r: radius.toFixed(1),
      delay: `${(-rand() * 4).toFixed(2)}s`,
      duration: `${(3 + rand() * 4).toFixed(2)}s`,
    }
  })
}
