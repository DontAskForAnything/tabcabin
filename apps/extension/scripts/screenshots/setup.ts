import { chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test'
import type { Dexie } from 'dexie'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { demoBundle } from './demo-data'

declare const chrome: typeof browser
declare const tabhangar: { db: Dexie }

const here = dirname(fileURLToPath(import.meta.url))
export const extensionPath = resolve(here, '../../.output/chrome-mv3-e2e')
export const OUT = resolve(here, '../../../../docs/screenshots')

/** Pages opened in the background so the tabs panel looks lived-in. */
const OPEN_TABS: [string, string][] = [
  [
    'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API',
    'Service Worker API – MDN',
  ],
  ['https://docs.github.com/en/actions', 'GitHub Actions documentation'],
  ['https://www.figma.com/files/recents', 'Recents – Figma'],
  ['https://news.ycombinator.com/item', 'Show HN: A self-hosted tab manager | Hacker News'],
  ['https://www.youtube.com/watch', 'Designing calm software – YouTube'],
  ['https://tailwindcss.com/blog', 'Blog – Tailwind CSS'],
]

export async function launch(
  scale = 1,
  viewport = { width: 1440, height: 900 },
  /** Folder for a WebM recording of every page. */
  recordVideoDir?: string,
): Promise<{ context: BrowserContext; worker: Worker }> {
  const profile = mkdtempSync(join(tmpdir(), 'tabhangar-shots-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    // Recordings capture the real window, so size the window instead of emulating a viewport
    // (144 px is what the headless window keeps for itself).
    ...(recordVideoDir
      ? { viewport: null, recordVideo: { dir: recordVideoDir, size: viewport } }
      : { viewport, deviceScaleFactor: scale }),
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      ...(recordVideoDir ? [`--window-size=${viewport.width},${viewport.height + 144}`] : []),
    ],
  })
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  context.on('close', () => rmSync(profile, { recursive: true, force: true }))
  return { context, worker }
}

export async function openTabs(context: BrowserContext, worker: Worker) {
  for (const [url, title] of OPEN_TABS) {
    const host = new URL(url).hostname
    await context.route(`https://${host}/**`, (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><meta charset="utf-8"><title>${title}</title><link rel="icon" href="https://www.google.com/s2/favicons?domain=${host}&sz=64"><h1>${title}</h1>`,
      }),
    )
    const page = await context.newPage()
    await page.goto(url)
  }
  await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({
      url: ['https://docs.github.com/*', 'https://tailwindcss.com/*'],
    })
    const groupId = await chrome.tabs.group({
      tabIds: tabs.map((t) => t.id!) as [number, ...number[]],
    })
    await chrome.tabGroups.update(groupId, { title: 'Docs', color: 'blue' })
  })
}

export async function loadDemo(worker: Worker, theme: 'light' | 'dark') {
  const bundle = demoBundle()
  const research = bundle.categories.find((c) => c.name === 'Research')!.id
  await worker.evaluate(
    async ({ bundle, settings }) => {
      const db = tabhangar.db
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((table) => table.clear()))
        await db.table('meta').put({ key: 'seeded', value: true })
        await db.table('workspaces').bulkPut(bundle.workspaces)
        await db.table('categories').bulkPut(bundle.categories)
        await db.table('groups').bulkPut(bundle.groups)
        await db.table('items').bulkPut(bundle.items)
        await db.table('reminders').bulkPut(bundle.reminders)
        await db
          .table('settings')
          .bulkPut(Object.entries(settings).map(([key, value]) => ({ key, value })))
      })
    },
    {
      bundle,
      settings: {
        theme,
        activeWorkspaceId: bundle.workspaces[0]!.id,
        viewModes: { [research]: 'collections' },
        notificationsAsked: true,
      },
    },
  )
}

export async function openApp(context: BrowserContext, worker: Worker): Promise<Page> {
  const id = new URL(worker.url()).host
  const page = await context.newPage()
  await page.goto(`chrome-extension://${id}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Launch week' })).toBeVisible()
  // Let favicons load, including those of items that are not on screen yet (other workspaces,
  // search results), so no icon pops in during a recording.
  const icons = [
    ...new Set(
      demoBundle()
        .items.map((item) => item.favIconUrl)
        .filter(Boolean),
    ),
  ]
  await page.evaluate(
    (urls) =>
      Promise.all(
        urls.map(
          (src) =>
            new Promise((done) => {
              const img = new Image()
              img.onload = img.onerror = done
              img.src = src!
            }),
        ),
      ),
    icons,
  )
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(1200)
  return page
}

/** A self-written article page behind the save popover. */
export const ARTICLE = `<!doctype html><meta charset="utf-8"><title>Designing calm software · Field notes</title>
<style>
  body { margin: 0; background: #faf8f4; color: #23201b; font: 19px/1.7 Georgia, 'Times New Roman', serif; }
  header { padding: 22px 48px; border-bottom: 1px solid #e8e2d6; font: 600 15px system-ui, sans-serif; letter-spacing: .02em; }
  main { max-width: 640px; margin: 64px 0 0 120px; }
  h1 { font-size: 46px; line-height: 1.15; margin: 0 0 12px; letter-spacing: -.01em; }
  .by { font: 15px system-ui, sans-serif; color: #7a7266; margin-bottom: 36px; }
  p { margin: 0 0 22px; }
</style>
<header>Field notes</header>
<main>
  <h1>Designing calm software</h1>
  <div class="by">8 min read · October 2026</div>
  <p>Most tools ask for attention all day long. Calm software does the opposite: it keeps what you need one glance away and stays quiet the rest of the time.</p>
  <p>Start with the moments people actually live in — a new tab, a half-read article, a task that can wait until Friday. Make saving them effortless and finding them again even easier.</p>
  <p>Then remove everything else. No badges that never go away, no feeds, no streaks. Just your things, where you left them.</p>
</main>`
