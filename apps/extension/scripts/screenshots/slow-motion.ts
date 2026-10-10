import type { BrowserContext, Page } from '@playwright/test'
import { setPace } from './session'

/**
 * Runs the tour `factor` times slower than scripted, so a slow machine has time to paint every
 * step: the script's waits, glides and typing, and the timers of pages opened afterwards (their
 * animations follow with `slowAnimations`). Recordings divide frame times by `factor` again;
 * call `setPace(1)` when done.
 */
export async function slowDown(context: BrowserContext, factor: number) {
  setPace(factor)
  await context.addInitScript((factor) => {
    const { setInterval: every, setTimeout: later } = globalThis
    globalThis.setTimeout = ((run: () => void, ms = 0, ...args: unknown[]) =>
      later(run, ms * factor, ...args)) as typeof setTimeout
    globalThis.setInterval = ((run: () => void, ms = 0, ...args: unknown[]) =>
      every(run, ms * factor, ...args)) as typeof setInterval
    // Animation code in JS (motion) reads these clocks: tie them to the document timeline,
    // which `slowAnimations` slows down.
    const now = performance.now.bind(performance)
    const timeline = () => (document.timeline.currentTime as number | null) ?? now()
    performance.now = timeline
    const frame = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (run) => frame(() => run(timeline()))
  }, factor)
}

/**
 * Slows the page's CSS and Web animations by `factor` to match. The text caret blinks on its own
 * clock, so it stops blinking instead.
 */
export async function slowAnimations(page: Page, factor: number) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / factor })
  await page.addStyleTag({ content: '* { caret-animation: manual }' })
}
