import { dueLinks, type Probe, recordCheck } from '@/db/linkChecks'
import { ALL_SITES } from '@/lib/allSites'
import { getSettings } from '@/settings/settings'

const ALARM = 'link-checks'
/** Looks per run (every six hours) and at the same time. */
const BATCH = 40
const PARALLEL = 4
const TIMEOUT = 10_000

async function ask(url: string, method: 'HEAD' | 'GET'): Promise<Probe> {
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT),
    })
    void response.body?.cancel().catch(() => undefined)
    return { status: response.status }
  } catch {
    return { status: null }
  }
}

/**
 * Asks a page whether it is still there: a HEAD request, and a GET to be sure when HEAD gets an
 * error (some servers answer HEAD badly). The body is never read.
 */
async function probe(url: string): Promise<Probe> {
  const head = await ask(url, 'HEAD')
  if (head.status !== null && head.status < 400) return head
  return ask(url, 'GET')
}

let running = false

/** Looks at the saved links that are due, when the user turned link checks on. */
export async function checkLinks() {
  if (running) return
  const settings = await getSettings()
  if (!settings.checkLinks || !navigator.onLine) return
  if (!(await browser.permissions.contains(ALL_SITES))) return
  running = true
  try {
    const urls = await dueLinks(Date.now(), BATCH)
    for (let i = 0; i < urls.length; i += PARALLEL)
      await Promise.all(
        urls.slice(i, i + PARALLEL).map(async (url) => recordCheck(url, await probe(url))),
      )
  } finally {
    running = false
  }
}

export function startLinkChecks() {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void checkLinks()
  })
  void browser.alarms.get(ALARM).then((alarm) => {
    if (!alarm) void browser.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: 360 })
  })
}
