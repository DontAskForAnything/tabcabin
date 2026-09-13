import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'
import { CURSOR, playSession } from './session'
import { launch, loadDemo, openApp, openTabs } from './setup'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../landing/public/demo.webm')

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

  await playSession(page)

  const video = page.video()!
  await page.close()
  await video.saveAs(OUT)
  await context.close()
  // Every page records a video; only the board is kept.
  rmSync(dir, { recursive: true, force: true })
})
