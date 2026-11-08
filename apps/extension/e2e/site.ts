import type { BrowserContext, Page } from '@playwright/test'

/** The e2e build lets pages on localhost talk to the extension, as the real one lets its site. */
export const SITE = 'http://localhost:4321'

declare const chrome: {
  runtime?: { sendMessage(id: string, message: object, reply: (value: unknown) => void): void }
}

/** Serves a bare page for every address of the pretend website. */
export async function routeSite(context: BrowserContext, title = 'TabCabin') {
  await context.route(`${SITE}/**`, (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><meta charset="utf-8"><title>${title}</title>`,
    }),
  )
}

/** What the website's page sends to TabCabin, and its answer. */
export const sendFromSite = (site: Page, extensionId: string, message: object) =>
  site.evaluate(
    ([id, body]) =>
      new Promise((resolve) => chrome.runtime!.sendMessage(id, body, (reply) => resolve(reply))),
    [extensionId, message] as const,
  )
