import { round } from './landscape'

/**
 * One closed contour line around a hill: a wobbly ring smoothed into curves. `level` shifts the
 * wobble a little from ring to ring, like real terrain.
 */
export function contour(
  cx: number,
  cy: number,
  radius: number,
  level: number,
  wobble: [number, number],
  stretch = 1.35,
): string {
  const count = 40
  const points = Array.from({ length: count }, (_, i) =>
    contourPoint(cx, cy, radius, level, wobble, (i / count) * Math.PI * 2, stretch),
  )
  const at = (i: number) => points[(i + count) % count]!
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`
  for (let i = 0; i < count; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d +=
      `C${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(p2[1] - (p3[1] - p1[1]) / 6)} ` +
      `${round(p2[0])} ${round(p2[1])}`
  }
  return `${d}Z`
}

/** The point of a contour line at `angle` (radians), e.g. to place a height label on it. */
export function contourPoint(
  cx: number,
  cy: number,
  radius: number,
  level: number,
  wobble: [number, number],
  angle: number,
  stretch = 1.35,
): [number, number] {
  const r =
    radius *
    (1 +
      0.16 * Math.sin(3 * angle + level * wobble[0]) +
      0.09 * Math.sin(5 * angle + 1.3 + level * wobble[1]) +
      0.04 * Math.sin(9 * angle + level * 0.5))
  return [cx + Math.cos(angle) * r * stretch, cy + Math.sin(angle) * r]
}
