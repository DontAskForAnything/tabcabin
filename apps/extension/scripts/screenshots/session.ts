import { expect, type Page } from '@playwright/test'

/** Videos do not show the system cursor, so the page draws one that follows the mouse. */
export const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div')
    cursor.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .08s;'
    cursor.innerHTML = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l17 10.5-7.4 1.6L8 22z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    document.documentElement.append(cursor)
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

async function wait(page: Page, ms: number) {
  await page.waitForTimeout(ms * pace)
}

export async function glide(page: Page, x: number, y: number, ms = 700) {
  const steps = Math.max(8, Math.round(ms / 16))
  const from = glidedTo.get(page)
  glidedTo.set(page, { x, y })
  if (pace === 1 || !from) {
    await page.mouse.move(x, y, { steps })
    return
  }
  // Slowed down: one step per 16 scripted milliseconds, on a clock.
  const start = Date.now()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps)
    const rest = start + (i * ms * pace) / steps - Date.now()
    if (rest > 0) await page.waitForTimeout(rest)
  }
}

export async function center(page: Page, locator: ReturnType<Page['locator']>) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

/** Drags an open tab into "Read later"; it is saved and closed. */
export async function dragTab(page: Page) {
  const tab = page.getByRole('button', { name: 'Service Worker API – MDN' }).first()
  const from = await center(page, tab)
  await glide(page, from.x - 40, from.y, 900)
  await page.mouse.down()
  const add = await center(
    page,
    page.getByRole('region', { name: 'Read later' }).getByRole('button', { name: 'Note or link' }),
  )
  await glide(page, (from.x + add.x) / 2, from.y - 60, 500)
  await glide(page, add.x, add.box.y - 12, 700)
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
  await page.keyboard.type('Ask beta testers for feedback /todo', { delay: 55 * pace })
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
  await page.keyboard.type('drizzle', { delay: 120 * pace })
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

/** Opens the reminders and closes them again. */
async function openReminders(page: Page) {
  const bell = await center(page, page.getByRole('button', { name: 'Reminders' }))
  await glide(page, bell.x, bell.y, 800)
  await page.mouse.click(bell.x, bell.y)
  await wait(page, 2600)
  await page.keyboard.press('Escape')
}

/** Goes back to "Today" and switches to the dark theme. */
async function goDark(page: Page) {
  const today = await center(page, page.getByRole('tab', { name: 'Today' }))
  await glide(page, today.x, today.y, 700)
  await page.mouse.click(today.x, today.y)
  await wait(page, 600)
  const more = await center(page, page.getByRole('button', { name: 'More' }).first())
  await glide(page, more.x, more.y, 700)
  await page.mouse.click(more.x, more.y)
  const theme = await center(page, page.getByRole('menuitem', { name: 'Theme' }))
  await glide(page, theme.x, theme.y, 400)
  await wait(page, 400)
  const dark = await center(page, page.getByRole('menuitem', { name: 'Dark' }))
  // Move right into the submenu first, then down, so it stays open.
  await glide(page, dark.x, theme.y, 300)
  await glide(page, dark.x, dark.y, 300)
  await page.mouse.click(dark.x, dark.y)
  await glide(page, 760, 560, 700)
  await expect(page.locator('html')).toHaveClass(/dark/)
  await wait(page, 2500)
}

/**
 * The scripted tour of the promo footage: save a tab by dragging it, add and tick to-dos,
 * search, switch to collections, open reminders, go dark. The demo GIF plays the first parts.
 * `mark` is called when each part starts.
 */
export async function playSession(page: Page, mark: (name: string) => unknown = () => undefined) {
  await mark('drag')
  await dragTab(page)
  await mark('todo')
  await addTodo(page)
  await mark('search')
  await search(page)
  await mark('collections')
  await openCollections(page)
  await mark('reminders')
  await openReminders(page)
  await mark('dark')
  await goDark(page)
  await mark('end')
}
