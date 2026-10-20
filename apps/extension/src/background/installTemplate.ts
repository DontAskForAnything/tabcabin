import { isTemplateId, type TemplateId } from '@tabcabin/core'
import { addTemplate } from './addTemplate'

/** The website (the e2e build stands in a local page for it). */
const SITE = import.meta.env.MODE === 'e2e' ? 'http://localhost:4321' : import.meta.env.WXT_SITE_URL

const STORE_HOST = 'chromewebstore.google.com'

/**
 * Which template a tab shows: a template page of the website, or the store page that a
 * template page sent someone to without TabCabin (it names the template in `utm_campaign`).
 */
export function templateOfUrl(
  href: string | undefined,
  site: string | undefined,
  extensionId: string,
): TemplateId | null {
  if (!URL.canParse(href ?? '')) return null
  const url = new URL(href!)
  let id: string | undefined
  if (site && URL.canParse(site) && url.origin === new URL(site).origin)
    id = url.pathname.match(/^\/templates\/([a-z-]+)\/?$/)?.[1]
  else if (
    url.hostname === STORE_HOST &&
    url.pathname.split('/').includes(extensionId) &&
    url.searchParams.get('utm_medium') === 'template'
  )
    id = url.searchParams.get('utm_campaign') ?? undefined
  return isTemplateId(id) ? id : null
}

/** The template in the tab used last, if any tab shows one. */
export function templateInTabs(
  tabs: { url?: string; lastAccessed?: number }[],
  site: string | undefined,
  extensionId: string,
): TemplateId | null {
  let found: { id: TemplateId; at: number } | null = null
  for (const tab of tabs) {
    const id = templateOfUrl(tab.url, site, extensionId)
    const at = tab.lastAccessed ?? 0
    if (id && (!found || at > found.at)) found = { id, at }
  }
  return found?.id ?? null
}

/**
 * Right after installing: someone who picked a template on the website gets that board at once,
 * instead of looking for the template again.
 */
export async function addTemplateOnInstall() {
  const id = templateInTabs(await browser.tabs.query({}), SITE, browser.runtime.id)
  if (id) await addTemplate(id)
}
