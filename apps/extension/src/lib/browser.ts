import { displayHost, normalizeUrl } from '@tabhangar/core'

const hasBrowser = () => typeof browser !== 'undefined' && !!browser.runtime?.id

/** Absolute URL of a file inside the extension (paths not known to the build, e.g. `/_favicon/`). */
export function extensionUrl(path: string): string {
  return (browser.runtime.getURL as (path: string) => string)(path)
}

/** Favicon from the browser's cache (needs the "favicon" permission). */
export function faviconUrl(pageUrl: string | null | undefined, size = 64): string | null {
  if (!pageUrl || !hasBrowser()) return null
  if (!/^https?:/i.test(pageUrl)) return null
  const url = new URL(extensionUrl('/_favicon/'))
  url.searchParams.set('pageUrl', pageUrl)
  url.searchParams.set('size', String(size))
  return url.toString()
}

/** The TabHangar page, optionally opening a view (`#reminders`, `#bin`). */
export function appUrl(view?: string): string {
  return extensionUrl(`/newtab.html${view ? `#${view}` : ''}`)
}

export function hostSeed(url: string | null | undefined, fallback = '?'): string {
  return displayHost(url) || fallback
}

export interface OpenOptions {
  /** Open in a new tab instead of the current one. */
  newTab?: boolean
  /** Activate an existing tab with the same URL if there is one. */
  focusExisting?: boolean
  /** Open in the background (new tab only). */
  background?: boolean
}

export async function openUrl(url: string, options: OpenOptions = {}) {
  if (!hasBrowser()) {
    window.open(url, options.newTab ? '_blank' : '_self')
    return
  }
  if (options.focusExisting) {
    const key = normalizeUrl(url)
    const tabs = await browser.tabs.query({})
    const match = tabs.find((tab) => tab.url && normalizeUrl(tab.url) === key)
    if (match?.id !== undefined) {
      await browser.tabs.update(match.id, { active: true })
      if (match.windowId !== undefined)
        await browser.windows.update(match.windowId, { focused: true })
      return
    }
  }
  if (options.newTab) {
    await browser.tabs.create({ url, active: !options.background })
    return
  }
  const current = await browser.tabs.getCurrent()
  if (current?.id !== undefined) await browser.tabs.update(current.id, { url })
  else await browser.tabs.create({ url })
}

type GroupColor =
  'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'

/** Opens URLs as a native browser tab group, optionally in a new window. */
export async function openAsTabGroup(
  urls: readonly string[],
  options: { title?: string; color?: GroupColor; newWindow?: boolean } = {},
) {
  if (urls.length === 0) return
  if (!hasBrowser()) {
    for (const url of urls) window.open(url, '_blank')
    return
  }
  let windowId: number | undefined
  let tabIds: number[]
  if (options.newWindow) {
    const win = await browser.windows.create({ url: [...urls], focused: true })
    windowId = win?.id
    tabIds = (win?.tabs ?? []).map((tab) => tab.id).filter((id): id is number => id !== undefined)
  } else {
    const tabs = await Promise.all(urls.map((url) => browser.tabs.create({ url, active: false })))
    tabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined)
    windowId = tabs[0]?.windowId
  }
  if (!browser.tabGroups || tabIds.length === 0) return
  const groupId = await browser.tabs.group({
    tabIds: tabIds as [number, ...number[]],
    ...(windowId !== undefined ? { createProperties: { windowId } } : {}),
  })
  await browser.tabGroups.update(groupId, {
    title: options.title ?? '',
    color: options.color ?? 'purple',
  })
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Base URL of the emoji data bundled with the extension (undefined outside the extension). */
export function emojiBaseUrl(): string | undefined {
  return hasBrowser() ? extensionUrl('/emoji').replace(/\/$/, '') : undefined
}

export async function hasNotifications(): Promise<boolean> {
  if (!hasBrowser()) return false
  return browser.permissions.contains({ permissions: ['notifications'] }).catch(() => false)
}

/** Must be called from a user gesture (before any await). */
export function requestNotifications(): Promise<boolean> {
  if (!hasBrowser()) return Promise.resolve(false)
  return browser.permissions.request({ permissions: ['notifications'] }).catch(() => false)
}
