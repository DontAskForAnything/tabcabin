import { expect, type Page, type Worker } from '@playwright/test'
import { center, glide, swoop, typeKeys, wait } from '../screenshots/session'
import { steadyCarets } from '../screenshots/slow-motion'

declare const chrome: typeof browser
declare const tabcabin: { togglePopover: (tab: object) => Promise<void> }

/** How far from the right edge of the window a dragged tab makes the board scroll, gently. */
const EDGE = 100

/*
 * The film's tour. Each part fits the scene it plays in (lengths in promo.js, BAR = 2.4 s) at
 * normal speed, with a little room for the caption to leave, and the mouse moves along eased
 * curves.
 */

/** Saves the open article with the popover: a note, a colour and a reminder (2 bars). */
export async function savePage(article: Page, worker: Worker) {
  await wait(article, 200)
  await swoop(article, 640, 330, 500)
  await wait(article, 150)
  const tab = await worker.evaluate(
    async () => (await chrome.tabs.query({ url: 'https://journal.example.dev/*' }))[0]!,
  )
  await worker.evaluate((tab) => tabcabin.togglePopover(tab), tab)
  const popover = article.getByRole('dialog', { name: 'TabCabin' })
  await expect(popover).toBeVisible()
  await steadyCarets(article)
  await wait(article, 350)
  await popover.getByRole('textbox').focus()
  await typeKeys(article, 'Share with the team on Friday', 30)
  await wait(article, 200)
  for (const name of ['Yellow', 'Tomorrow', 'Save']) {
    const target = await center(article, popover.getByRole('button', { name, exact: true }))
    await swoop(article, target.x, target.y, 340)
    await article.mouse.click(target.x, target.y)
    await wait(article, 200)
  }
  // End on the confirmation, before the popover closes itself.
  await expect(popover.getByText(/Saved to/)).toBeVisible()
  await wait(article, 580)
}

/**
 * Drags an open tab into "Read later", which starts at the right edge of the window: held near the
 * edge, the board scrolls until the column is in full view, then the tab drops into it and is
 * saved and closed (2 bars).
 */
async function dragTab(page: Page) {
  const tab = page.getByRole('button', { name: 'Service Worker API – MDN' }).first()
  const from = await center(page, tab)
  await wait(page, 250)
  await swoop(page, from.x - 40, from.y, 850)
  await page.mouse.down()
  await wait(page, 250)
  const column = page.getByRole('region', { name: 'Read later' })
  const target = column.getByRole('button', { name: 'Note or link' })
  const width = await page.evaluate(() => innerWidth)
  const start = await center(page, target)
  await swoop(page, width - EDGE, start.box.y - 12, 1000, 40)
  const inView = async () => {
    const box = (await column.boundingBox())!
    return box.x + box.width <= width - 24
  }
  while (!(await inView())) await wait(page, 16)
  const add = await center(page, target)
  await swoop(page, add.x, add.box.y - 12, 450)
  await wait(page, 250)
  await page.mouse.up()
  await wait(page, 1230)
  // A drop that misses the column must fail the recording, not end up in the film.
  await expect(column.getByRole('link', { name: /Service Worker API – MDN/ })).toBeVisible()
}

/** Scrolls the board back to its start between two parts of the tour, off camera. */
async function resetBoard(page: Page) {
  await page.getByRole('region', { name: 'Launch week' }).evaluate((group) => {
    for (let node = group.parentElement; node; node = node.parentElement) node.scrollLeft = 0
  })
  await wait(page, 100)
}

/** Adds a to-do in "Launch week" and ticks another one (2 bars). */
async function addTodo(page: Page) {
  const launchWeek = page.getByRole('region', { name: 'Launch week' })
  const note = await center(page, launchWeek.getByRole('button', { name: 'Note or link' }))
  await swoop(page, note.x, note.y, 650)
  await page.mouse.click(note.x, note.y)
  await wait(page, 250)
  await typeKeys(page, 'Ask beta testers for feedback /todo', 40)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await wait(page, 500)
  const check = await center(page, launchWeek.getByRole('checkbox').nth(1))
  await swoop(page, check.x, check.y, 600)
  await page.mouse.click(check.x, check.y)
  await wait(page, 1100)
}

/** Searches with ⌘K and jumps to the result (1½ bars). */
async function search(page: Page) {
  await swoop(page, 820, 500, 450)
  await page.keyboard.press('Control+k')
  await wait(page, 400)
  await typeKeys(page, 'drizzle', 90)
  await wait(page, 500)
  await page.keyboard.press('Control+Enter')
  await wait(page, 1300)
}

/** Clicks `name` in the category tabs and lets the view settle (1½ bars). */
async function openCategory(page: Page, name: string) {
  const category = await center(page, page.getByRole('tab', { name }))
  await swoop(page, category.x, category.y, 800)
  await page.mouse.click(category.x, category.y)
  await wait(page, 2500)
}

/** Opens the reminders and closes them again (1½ bars). */
async function openReminders(page: Page) {
  const bell = await center(page, page.getByRole('button', { name: 'Reminders' }))
  await swoop(page, bell.x, bell.y, 800)
  await page.mouse.click(bell.x, bell.y)
  await wait(page, 1940)
  await page.keyboard.press('Escape')
  // The rest of the page is inert until the sheet has gone.
  await expect(page.getByRole('tab', { name: 'Today' })).toBeVisible()
}

/**
 * Goes back to "Today" and switches to the dark theme (1½ bars); calls `mark('night')` as the app
 * turns dark, for the sunset behind the window.
 */
async function goDark(page: Page, mark: (name: string) => unknown) {
  const today = await center(page, page.getByRole('tab', { name: 'Today' }))
  await swoop(page, today.x, today.y, 500)
  await page.mouse.click(today.x, today.y)
  await wait(page, 250)
  const more = await center(page, page.getByRole('button', { name: 'More' }).first())
  await swoop(page, more.x, more.y, 450)
  await page.mouse.click(more.x, more.y)
  const theme = await center(page, page.getByRole('menuitem', { name: 'Theme' }))
  await swoop(page, theme.x, theme.y, 300)
  await wait(page, 200)
  const dark = await center(page, page.getByRole('menuitem', { name: 'Dark' }))
  // Move right into the submenu first, then down, so it stays open.
  await glide(page, dark.x, theme.y, 180)
  await glide(page, dark.x, dark.y, 200)
  await page.mouse.click(dark.x, dark.y)
  await expect(page.locator('html')).toHaveClass(/dark/)
  await mark('night')
  await swoop(page, 760, 560, 400)
  await wait(page, 790)
}

/**
 * The tour of the new tab page: save a tab by dragging it, add and tick to-dos, search, switch
 * to collections, open reminders, go dark. `mark` is called when each part starts.
 */
export async function playTour(page: Page, mark: (name: string) => unknown) {
  await mark('drag')
  await dragTab(page)
  await mark('drag-end')
  await resetBoard(page)
  await mark('todo')
  await addTodo(page)
  await mark('search')
  await search(page)
  await mark('collections')
  await openCategory(page, 'Research')
  await mark('reminders')
  await openReminders(page)
  await mark('dark')
  await goDark(page, mark)
  await mark('end')
}
