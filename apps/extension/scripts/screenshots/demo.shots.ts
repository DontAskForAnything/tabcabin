import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import gifenc from 'gifenc'
import { PNG } from 'pngjs'
import { launch, loadDemo, openApp, openTabs, OUT } from './setup'

const { applyPalette, GIFEncoder, quantize } = gifenc

/** Screenshots taken back to back while the demo runs. */
class Recorder {
  private frames: { png: Buffer; at: number }[] = []
  private running: Promise<void> | null = null
  private active = false

  start(page: Page) {
    this.active = true
    this.running = (async () => {
      while (this.active) {
        const started = Date.now()
        this.frames.push({ png: await page.screenshot(), at: started })
        const rest = 90 - (Date.now() - started)
        if (rest > 0) await page.waitForTimeout(rest)
      }
    })()
  }

  async stop() {
    this.active = false
    await this.running
  }

  /** Encodes the frames as a looping GIF, merging identical consecutive frames. */
  toGif(holdLastMs = 1800): Uint8Array {
    const gif = GIFEncoder()
    const merged: { png: Buffer; delay: number }[] = []
    this.frames.forEach((frame, i) => {
      const next = this.frames[i + 1]
      const delay = next ? next.at - frame.at : holdLastMs
      const last = merged.at(-1)
      if (last && last.png.equals(frame.png)) last.delay += delay
      else merged.push({ png: frame.png, delay })
    })
    for (const frame of merged) {
      const { data, width, height } = PNG.sync.read(frame.png)
      const palette = quantize(data, 256)
      gif.writeFrame(applyPalette(data, palette), width, height, {
        palette,
        delay: Math.max(20, frame.delay),
      })
    }
    gif.finish()
    return gif.bytes()
  }
}

async function dragTo(page: Page, from: string, to: string) {
  const source = (await page.getByRole('button', { name: from }).first().boundingBox())!
  // Drop just above the group's "Note or link" row, at the end of its list.
  const target = (await page
    .getByRole('region', { name: to })
    .getByRole('button', { name: 'Note or link' })
    .boundingBox())!
  await page.mouse.move(source.x + 60, source.y + source.height / 2)
  await page.mouse.down()
  const end = { x: target.x + target.width / 2, y: target.y - 12 }
  const steps = 28
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    await page.mouse.move(
      source.x + 60 + (end.x - source.x - 60) * ease,
      source.y + source.height / 2 + (end.y - source.y - source.height / 2) * ease,
    )
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(350)
  await page.mouse.up()
}

test('demo animation', async () => {
  test.setTimeout(180_000)
  const { context, worker } = await launch(2 / 3, { width: 1440, height: 900 })
  await openTabs(context, worker)
  await loadDemo(worker, 'light')
  const page = await openApp(context, worker)
  await page.bringToFront()
  const recorder = new Recorder()
  recorder.start(page)
  await page.waitForTimeout(900)

  await dragTo(page, 'Service Worker API – MDN', 'Read later')
  await page.waitForTimeout(1100)

  const launchWeek = page.getByRole('region', { name: 'Launch week' })
  await launchWeek.getByRole('button', { name: 'Note or link' }).click()
  await page.keyboard.type('Ask beta testers for feedback /todo', { delay: 45 })
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)

  await page.keyboard.press('Control+k')
  await page.waitForTimeout(300)
  await page.keyboard.type('drizzle', { delay: 90 })
  await page.waitForTimeout(700)
  await page.keyboard.press('Control+Enter')
  await page.waitForTimeout(1600)

  await page.getByRole('tab', { name: 'Research' }).click()
  await page.waitForTimeout(1500)
  await recorder.stop()

  writeFileSync(join(OUT, 'demo.gif'), recorder.toGif())
  await context.close()
})
