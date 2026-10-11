import type { Page } from '@playwright/test'

/**
 * Videos do not show the system cursor, so the page draws one that follows the mouse. It lives in
 * the top layer, above popovers such as the extension's in-page one, and goes back on top whenever
 * another one opens.
 */
export const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div')
    cursor.style.cssText = 'position:fixed;inset:0 auto auto 0;margin:0;padding:0;border:0;background:none;overflow:visible;width:22px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .08s;'
    cursor.innerHTML = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l17 10.5-7.4 1.6L8 22z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    cursor.popover = 'manual'
    document.documentElement.append(cursor)
    const raise = () => { try { cursor.hidePopover(); cursor.showPopover() } catch {} }
    raise()
    addEventListener('toggle', (e) => { if (e.target !== cursor && e.newState === 'open') raise() }, true)
    let x = -50, y = -50, down = false
    const draw = () => (cursor.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (down ? 0.85 : 1) + ')')
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; draw() }, true)
    addEventListener('pointerdown', () => { down = true; draw() }, true)
    addEventListener('pointerup', () => { down = false; draw() }, true)
  })
`

/**
 * Real milliseconds per scripted millisecond. Recordings on a slow machine raise it and slow the
 * page down to match (see `slow-motion.ts`), so every step of a glide gets painted.
 */
let pace = 1
const glidedTo = new WeakMap<Page, { x: number; y: number }>()

export function setPace(value: number) {
  pace = value
}

export async function wait(page: Page, ms: number) {
  await page.waitForTimeout(ms * pace)
}

/** Types `text` with `ms` scripted milliseconds per key. */
export async function typeKeys(page: Page, text: string, ms: number) {
  await page.keyboard.type(text, { delay: ms * pace })
}

/** Moves the mouse along `path` (t from 0 to 1), one step per 60 fps frame of scripted time. */
async function follow(page: Page, path: (t: number) => { x: number; y: number }, ms: number) {
  const steps = Math.max(8, Math.round((ms * 60) / 1000))
  const start = Date.now()
  for (let i = 1; i <= steps; i++) {
    const { x, y } = path(i / steps)
    await page.mouse.move(x, y)
    const rest = start + (i * ms * pace) / steps - Date.now()
    if (rest > 0) await page.waitForTimeout(rest)
  }
}

export async function glide(page: Page, x: number, y: number, ms = 700) {
  const from = glidedTo.get(page)
  glidedTo.set(page, { x, y })
  if (pace === 1 || !from) {
    await page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 16)) })
    return
  }
  // Slowed down: on a clock, so every step gets painted.
  await follow(page, (t) => ({ x: from.x + (x - from.x) * t, y: from.y + (y - from.y) * t }), ms)
}

/**
 * Moves the mouse like a hand does: along a curve that bows `bend` pixels upwards (less on short
 * moves), starting slowly, speeding up and slowing down again before (x, y).
 */
export async function swoop(page: Page, x: number, y: number, ms: number, bend = 30) {
  const from = glidedTo.get(page)
  if (!from) return glide(page, x, y, ms)
  glidedTo.set(page, { x, y })
  const lift = Math.min(bend, Math.hypot(x - from.x, y - from.y) / 8)
  const control = { x: (from.x + x) / 2, y: (from.y + y) / 2 - 2 * lift }
  await follow(
    page,
    (t) => {
      const s = (1 - Math.cos(Math.PI * t)) / 2
      return {
        x: (1 - s) ** 2 * from.x + 2 * (1 - s) * s * control.x + s ** 2 * x,
        y: (1 - s) ** 2 * from.y + 2 * (1 - s) * s * control.y + s ** 2 * y,
      }
    },
    ms,
  )
}

export async function center(page: Page, locator: ReturnType<Page['locator']>) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

/** Drags an open tab into "Read later" along one eased curve; it is saved and closed. */
export async function dragTab(page: Page) {
  const tab = page.getByRole('button', { name: 'Service Worker API – MDN' }).first()
  const from = await center(page, tab)
  await swoop(page, from.x - 40, from.y, 1000)
  await page.mouse.down()
  await wait(page, 250)
  const target = page
    .getByRole('region', { name: 'Read later' })
    .getByRole('button', { name: 'Note or link' })
  const add = await center(page, target)
  await swoop(page, add.x, add.box.y - 12, 2000, 40)
  await wait(page, 500)
  await page.mouse.up()
  await wait(page, 1600)
}

/** Adds a to-do in "Launch week" and ticks another one. */
export async function addTodo(page: Page) {
  const launchWeek = page.getByRole('region', { name: 'Launch week' })
  const note = await center(page, launchWeek.getByRole('button', { name: 'Note or link' }))
  await glide(page, note.x, note.y, 800)
  await page.mouse.click(note.x, note.y)
  await typeKeys(page, 'Ask beta testers for feedback /todo', 55)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await wait(page, 700)

  const check = await center(page, launchWeek.getByRole('checkbox').nth(1))
  await glide(page, check.x, check.y, 700)
  await page.mouse.click(check.x, check.y)
  await wait(page, 1100)
}

/** Searches with ⌘K and jumps to the result. */
export async function search(page: Page) {
  await glide(page, 820, 500, 500)
  await page.keyboard.press('Control+k')
  await wait(page, 500)
  await typeKeys(page, 'drizzle', 120)
  await wait(page, 900)
  await page.keyboard.press('Control+Enter')
  await wait(page, 2000)
}

/** Switches to the collections view of another category. */
export async function openCollections(page: Page) {
  const research = await center(page, page.getByRole('tab', { name: 'Research' }))
  await glide(page, research.x, research.y, 800)
  await page.mouse.click(research.x, research.y)
  await wait(page, 2200)
}
