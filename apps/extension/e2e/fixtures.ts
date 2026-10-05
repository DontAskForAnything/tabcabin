import { type BrowserContext, chromium, test as base } from '@playwright/test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const extensionPath = resolve(dirname(fileURLToPath(import.meta.url)), '../.output/chrome-mv3-e2e')

/** Browser profiles of a test run; e2e/teardown.ts removes what is left when the run ends. */
export const PROFILES_DIR = join(tmpdir(), 'tabcabin-e2e')

/** A fresh browser profile with the built extension loaded (run `pnpm build:e2e` first). */
export async function launchExtension(): Promise<BrowserContext> {
  mkdirSync(PROFILES_DIR, { recursive: true })
  const userDataDir = mkdtempSync(join(PROFILES_DIR, 'profile-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
  // Profiles are a few megabytes each; don't leave hundreds of them behind.
  context.on('close', () =>
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }),
  )
  return context
}

export async function extensionIdOf(context: BrowserContext): Promise<string> {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  return new URL(worker.url()).host
}

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await launchExtension()
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    await use(await extensionIdOf(context))
  },
})

export const expect = test.expect
