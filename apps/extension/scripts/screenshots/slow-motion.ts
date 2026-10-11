import type { BrowserContext, Page } from '@playwright/test'
import { setPace } from './session'

/**
 * Runs in a page: stretches its timers by `factor` and ties the clocks that animation code in JS
 * (motion) reads to the document timeline, which `slowAnimations` slows down.
 */
function slowClocks(factor: number) {
  const { setInterval: every, setTimeout: later } = globalThis
  globalThis.setTimeout = ((run: () => void, ms = 0, ...args: unknown[]) =>
    later(run, ms * factor, ...args)) as typeof setTimeout
  globalThis.setInterval = ((run: () => void, ms = 0, ...args: unknown[]) =>
    every(run, ms * factor, ...args)) as typeof setInterval
  const now = performance.now.bind(performance)
  const timeline = () => (document.timeline.currentTime as number | null) ?? now()
  performance.now = timeline
  const frame = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = (run) => frame(() => run(timeline()))
}

/**
 * Runs the tour `factor` times slower than scripted, so a slow machine has time to paint every
 * step: the script's waits, glides and typing, and the timers of pages opened afterwards (their
 * animations follow with `slowAnimations`). Recordings divide frame times by `factor` again;
 * call `setPace(1)` when done.
 */
export async function slowDown(context: BrowserContext, factor: number) {
  setPace(factor)
  await context.addInitScript(slowClocks, factor)
}

/**
 * Slows the page's CSS and Web animations by `factor` to match, and the clocks of the extension's
 * content scripts injected into it later (they run in their own world, which init scripts do not
 * reach). Text carets blink on their own clock, so they stop blinking instead (call
 * `steadyCarets` again for UI added in a shadow root later).
 */
export async function slowAnimations(page: Page, factor: number) {
  const cdp = await page.context().newCDPSession(page)
  cdp.on('Runtime.executionContextCreated', ({ context }) => {
    const aux = context.auxData as { type?: string } | undefined
    if (aux?.type !== 'isolated' || !context.origin.startsWith('chrome-extension://')) return
    const expression = `(${slowClocks.toString()})(${factor})`
    void cdp.send('Runtime.evaluate', { expression, contextId: context.id }).catch(() => undefined)
  })
  await cdp.send('Runtime.enable')
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / factor })
  await steadyCarets(page)
}

/** Stops text carets from blinking in the page and in its open shadow roots. */
export async function steadyCarets(page: Page) {
  await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('*')].flatMap((el) => el.shadowRoot ?? [])
    for (const root of [document.head, ...hosts]) {
      if (root.querySelector('style[data-steady]')) continue
      const style = document.createElement('style')
      style.dataset.steady = ''
      style.textContent = '* { caret-animation: manual }'
      root.append(style)
    }
  })
}
