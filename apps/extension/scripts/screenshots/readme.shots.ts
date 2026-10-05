import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { ARTICLE, launch, loadDemo, openApp, openTabs, OUT } from './setup'

declare const chrome: typeof browser
declare const tabcabin: { togglePopover: (tab: object) => Promise<void> }

const shot = (page: Page, name: string) => page.screenshot({ path: join(OUT, `${name}.png`) })

test.describe.configure({ timeout: 180_000 })

for (const theme of ['light', 'dark'] as const) {
  test(`README screenshots (${theme})`, async () => {
    mkdirSync(OUT, { recursive: true })
    const { context, worker } = await launch()
    await openTabs(context, worker)
    await loadDemo(worker, theme)
    const page = await openApp(context, worker)
    await page.bringToFront()
    await shot(page, `board-${theme}`)

    await page.getByRole('tab', { name: 'Research' }).click()
    await page.waitForTimeout(900)
    await shot(page, `collections-${theme}`)
    await page.getByRole('tab', { name: 'Today' }).click()

    if (theme === 'light') {
      await page.keyboard.press('Control+k')
      await page.keyboard.type('docs')
      await page.waitForTimeout(500)
      await shot(page, 'search')
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Reminders' }).click()
      await page.waitForTimeout(500)
      await shot(page, 'reminders')
      await page.keyboard.press('Escape')

      await page.keyboard.press('Control+o')
      await page.waitForTimeout(500)
      await shot(page, 'workspaces')
      await page.keyboard.press('Escape')

      await context.route('https://journal.example.dev/**', (route) =>
        route.fulfill({ contentType: 'text/html; charset=utf-8', body: ARTICLE }),
      )
      const article = await context.newPage()
      await article.goto('https://journal.example.dev/calm-software')
      const tab = await worker.evaluate(
        async () => (await chrome.tabs.query({ url: 'https://journal.example.dev/*' }))[0]!,
      )
      await worker.evaluate((tab) => tabcabin.togglePopover(tab), tab)
      await expect(article.getByRole('dialog', { name: 'TabCabin' })).toBeVisible()
      await article.waitForTimeout(600)
      await shot(article, 'popover')
    }
    await context.close()
  })
}
