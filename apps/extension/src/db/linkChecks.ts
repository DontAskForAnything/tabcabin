import { normalizeUrl } from '@tabcabin/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LinkCheck } from './db'

const DAY = 24 * 60 * 60 * 1000
/** A page that answered is looked at again after a week, one that did not after a day. */
export const RECHECK_AFTER = 7 * DAY
export const RETRY_AFTER = DAY

/** What one look at a page found: its HTTP status, or null when it did not answer. */
export type Probe = { status: number | null }

/**
 * A page is broken when the server says it is gone (404, 410), or when it did not answer or
 * failed with a server error twice in a row, so a site that is down for an hour or a laptop
 * without network marks nothing. Other answers (a login wall, a site that turns robots away)
 * count as working.
 */
export function nextCheck(previous: LinkCheck | undefined, url: string, probe: Probe, now: number) {
  const gone = probe.status === 404 || probe.status === 410
  const failed = probe.status === null || probe.status >= 500
  const failures = failed ? (previous?.failures ?? 0) + 1 : 0
  return {
    url,
    checkedAt: now,
    status: probe.status,
    failures,
    broken: gone || failures >= 2,
  } satisfies LinkCheck
}

const isDue = (check: LinkCheck | undefined, now: number) =>
  !check || now - check.checkedAt >= (check.failures > 0 ? RETRY_AFTER : RECHECK_AFTER)

/** Saved web addresses that are due for a look, the longest unchecked first. */
export async function dueLinks(now: number, limit: number): Promise<string[]> {
  const [items, checks] = await Promise.all([db.items.toArray(), db.linkChecks.toArray()])
  const byUrl = new Map(checks.map((check) => [check.url, check]))
  const urls = new Map<string, string>()
  for (const item of items) {
    if (item.deletedAt !== null || item.kind !== 'link' || !item.url) continue
    if (!/^https?:\/\//i.test(item.url)) continue
    const key = normalizeUrl(item.url)
    if (key && !urls.has(key)) urls.set(key, item.url)
  }
  return [...urls]
    .filter(([key]) => isDue(byUrl.get(key), now))
    .sort(([a], [b]) => (byUrl.get(a)?.checkedAt ?? 0) - (byUrl.get(b)?.checkedAt ?? 0))
    .slice(0, limit)
    .map(([, url]) => url)
}

export async function recordCheck(url: string, probe: Probe, now = Date.now()) {
  const key = normalizeUrl(url)
  if (!key) return
  await db.transaction('rw', db.linkChecks, async () => {
    await db.linkChecks.put(nextCheck(await db.linkChecks.get(key), key, probe, now))
  })
}

async function loadBroken(): Promise<Set<string>> {
  const checks = await db.linkChecks.filter((check) => check.broken).toArray()
  return new Set(checks.map((check) => check.url))
}

const NONE = new Set<string>()

/** Addresses (normalized) that did not load when last checked. */
export function useBrokenLinks(enabled: boolean): Set<string> {
  return useLiveQuery(() => (enabled ? loadBroken() : Promise.resolve(NONE)), [enabled]) ?? NONE
}
