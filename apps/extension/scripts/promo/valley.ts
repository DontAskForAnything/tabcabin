/**
 * The film's backdrop: the same forest valley as the website's header, drawn at 1920×1080 with
 * the website's drawing code. Colours are CSS variables, so the film can move from morning to
 * night frame by frame; the moving parts carry ids and classes for promo.js.
 */
import {
  forest,
  land,
  mountains,
  ridge,
  round,
  seeded,
  spruce,
  stars,
} from '../../../landing/src/lib/landscape.ts'

const W = 1920
const H = 1080
/** Where the cabin stands, for the camera and the smoke. */
export const CABIN = { x: 1330, scale: 1.7 }

const fill = (token: string) => `style="fill: var(--${token})"`

export function valleySvg(): string {
  const rand = seeded(11)
  const range = mountains(
    [
      [-30, 700],
      [120, 650],
      [260, 600],
      [400, 640],
      [560, 580],
      [720, 650],
      [880, 676],
      [1040, 640],
      [1200, 600],
      [1360, 540],
      [1500, 580],
      [1660, 520],
      [1800, 590],
      [1950, 560],
    ],
    H,
    rand,
  )
  const far = forest({
    width: W,
    bottom: H,
    y: ridge({ base: 742, amp: 12, phase: 1.3 }),
    rand,
    gap: 15,
    min: 22,
    max: 40,
  })
  const middleGround = ridge({ base: 806, amp: 16, phase: 2.7 })
  const cabinY = middleGround(CABIN.x)
  const middle = forest({
    width: W,
    bottom: H,
    y: ridge({ base: 806, amp: 16, phase: 2.7, pin: { x: CABIN.x, y: cabinY, reach: 100 } }),
    rand,
    gap: 24,
    min: 38,
    max: 66,
    skip: (x) => Math.abs(x - CABIN.x) < 52,
  })
  const near = forest({
    width: W,
    bottom: H,
    y: ridge({ base: 884, amp: 22, phase: 4.2 }),
    rand,
    gap: 38,
    min: 64,
    max: 116,
  })
  const frontGround = ridge({ base: 1062, amp: 10, phase: 0.4 })
  const frontRand = seeded(5)
  const front =
    [-40, 34, 104, 172, 1740, 1806, 1868, 1950]
      .map((x) => {
        const tall = 250 + frontRand() * 170
        return spruce(x, frontGround(x) + 8, tall, tall * 0.42)
      })
      .join('') + land(frontGround, W, H + 40)
  const sky = stars(seeded(3), 220, { x: 0, y: 20, width: W, height: 640 })
    .map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="#F4EAD5"/>`)
    .join('')
  const flyRand = seeded(17)
  const flies = Array.from({ length: 22 }, (_, i) => {
    const x = round(i % 2 ? 1640 + flyRand() * 260 : 20 + flyRand() * 300)
    const y = round(820 + flyRand() * 200)
    return `<g class="v-fly" data-x="${x}" data-y="${y}" data-phase="${(flyRand() * 6.28).toFixed(2)}"><circle r="9" fill="url(#v-fly)"/><circle r="2.2" fill="#EEF3C9"/></g>`
  }).join('')
  const mist = (id: string, y: number, h: number) =>
    `<rect x="-60" y="${y}" width="${W + 120}" height="${h}" fill="url(#${id})"/>`
  const cy = Math.round(cabinY + 1)
  const puffs = Array.from(
    { length: 9 },
    () => `<circle class="v-puff" cx="12.5" cy="-50" r="6" fill="url(#v-puff)"/>`,
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-cabin-x="${CABIN.x}" data-cabin-y="${cy}">
<defs>
  ${[0.95, 0.75, 0.55]
    .map(
      (alpha, i) =>
        `<linearGradient id="v-mist-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color: var(--sky-bottom); stop-opacity: 0"/><stop offset="1" style="stop-color: var(--sky-bottom); stop-opacity: ${alpha}"/></linearGradient>`,
    )
    .join('')}
  <radialGradient id="v-glow"><stop offset="0" stop-color="#F4EAD5" stop-opacity="0.4"/><stop offset="0.45" stop-color="#F4EAD5" stop-opacity="0.16"/><stop offset="1" stop-color="#F4EAD5" stop-opacity="0"/></radialGradient>
  <radialGradient id="v-fly"><stop offset="0" stop-color="#F4EAD5" stop-opacity="0.55"/><stop offset="1" stop-color="#F4EAD5" stop-opacity="0"/></radialGradient>
  <radialGradient id="v-puff"><stop offset="0" style="stop-color: var(--smoke); stop-opacity: 0.9"/><stop offset="1" style="stop-color: var(--smoke); stop-opacity: 0"/></radialGradient>
  <mask id="v-crescent"><rect x="300" y="60" width="240" height="240" fill="#fff"/><circle cx="436" cy="168" r="34" fill="#000"/></mask>
</defs>
<g id="v-stars">${sky}</g>
<g id="v-moon"><circle cx="420" cy="180" r="130" fill="url(#v-glow)" opacity="0.5"/><circle cx="420" cy="180" r="36" fill="#F4EAD5" mask="url(#v-crescent)"/></g>
<g id="v-sun"><circle cx="1520" cy="520" r="150" opacity="0.35" ${fill('sun')}/><circle cx="1520" cy="520" r="94" ${fill('sun')}/></g>
<g data-depth="0.15"><path d="${range}" ${fill('mountain')}/>${mist('v-mist-0', 560, 220)}</g>
<g data-depth="0.3"><path d="${far}" ${fill('far')}/>${mist('v-mist-1', 726, 96)}</g>
<g data-depth="0.5">
  <path d="${middle}" ${fill('middle')}/>
  <g transform="translate(${CABIN.x} ${cy}) scale(${CABIN.scale})">
    <circle id="v-window-glow" cx="-9" cy="-13" r="40" fill="url(#v-glow)"/>
    <rect x="9" y="-46" width="7" height="16" ${fill('cabin')}/>
    <path d="M-24 -24 L0 -42 L24 -24 L24 0 L-24 0 Z" ${fill('cabin')}/>
    <path d="M-29 -21 L0 -45 L29 -21" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--roof)"/>
    <rect x="-15" y="-18" width="12" height="10" rx="1" ${fill('glass')}/>
    <rect id="v-window" x="-15" y="-18" width="12" height="10" rx="1" fill="#F4EAD5"/>
    <rect x="5" y="-15" width="9" height="15" rx="1" style="fill: var(--roof)"/>
    <g id="v-smoke">${puffs}</g>
  </g>
  ${mist('v-mist-2', 812, 80)}
</g>
<g data-depth="0.75"><path d="${near}" ${fill('near')}/><g id="v-flies">${flies}</g></g>
<g data-depth="1"><path d="${front}" ${fill('front')}/></g>
</svg>`
}
