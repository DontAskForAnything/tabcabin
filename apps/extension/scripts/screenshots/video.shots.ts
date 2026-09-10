import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { launch, loadDemo, openApp, openTabs } from './setup'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../landing/public/demo.webm')

/** Videos do not show the system cursor, so the page draws one that follows the mouse. */
const CURSOR = `
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

async function glide(page: Page, x: number, y: number, ms = 700) {
  await page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 16)) })
}

async function center(page: Page, locator: ReturnType<Page['locator']>) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

test('demo video', async () => {
  test.setTimeout(240_000)
  const dir = mkdtempSync(join(tmpdir(), 'tabhangar-video-'))
  const { context, worker } = await launch(1, { width: 1280, height: 800 }, dir)
  await context.addInitScript(CURSOR)
  await openTabs(context, worker)
  await loadDemo(worker, 'light')
  const page = await openApp(context, worker)
  await page.bringToFront()
  await page.mouse.move(900, 600)
  await page.waitForTimeout(1500)

  // 1. Drag an open tab into "Read later"; it is saved and closed.
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
  await page.waitForTimeout(500)
  await page.mouse.up()
  await page.waitForTimeout(1600)

  // 2. Add a to-do in "Launch week".
  const launchWeek = page.getByRole('region', { name: 'Launch week' })
  const note = await center(page, launchWeek.getByRole('button', { name: 'Note or link' }))
  await glide(page, note.x, note.y, 800)
  await page.mouse.click(note.x, note.y)
  await page.keyboard.type('Ask beta testers for feedback /todo', { delay: 55 })
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)

  // 3. Tick a to-do.
  const check = await center(page, launchWeek.getByRole('checkbox').nth(1))
  await glide(page, check.x, check.y, 700)
  await page.mouse.click(check.x, check.y)
  await page.waitForTimeout(1100)

  // 4. Search and jump to the result.
  await glide(page, 820, 500, 500)
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(500)
  await page.keyboard.type('drizzle', { delay: 120 })
  await page.waitForTimeout(900)
  await page.keyboard.press('Control+Enter')
  await page.waitForTimeout(2000)

  // 5. Collections view of another category.
  const research = await center(page, page.getByRole('tab', { name: 'Research' }))
  await glide(page, research.x, research.y, 800)
  await page.mouse.click(research.x, research.y)
  await page.waitForTimeout(2200)

  // 6. Reminders.
  const bell = await center(page, page.getByRole('button', { name: 'Reminders' }))
  await glide(page, bell.x, bell.y, 800)
  await page.mouse.click(bell.x, bell.y)
  await page.waitForTimeout(2600)
  await page.keyboard.press('Escape')

  // 7. Dark theme.
  const today = await center(page, page.getByRole('tab', { name: 'Today' }))
  await glide(page, today.x, today.y, 700)
  await page.mouse.click(today.x, today.y)
  await page.waitForTimeout(600)
  const more = await center(page, page.getByRole('button', { name: 'More' }).first())
  await glide(page, more.x, more.y, 700)
  await page.mouse.click(more.x, more.y)
  const theme = await center(page, page.getByRole('menuitem', { name: 'Theme' }))
  await glide(page, theme.x, theme.y, 400)
  await page.waitForTimeout(400)
  const dark = await center(page, page.getByRole('menuitem', { name: 'Dark' }))
  // Move right into the submenu first, then down, so it stays open.
  await glide(page, dark.x, theme.y, 300)
  await glide(page, dark.x, dark.y, 300)
  await page.mouse.click(dark.x, dark.y)
  await glide(page, 760, 560, 700)
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.waitForTimeout(2500)

  const video = page.video()!
  await page.close()
  await video.saveAs(OUT)
  await context.close()
  // Every page records a video; only the board is kept.
  rmSync(dir, { recursive: true, force: true })
})
