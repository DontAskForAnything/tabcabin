import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import { SyncEngine } from '@/sync/engine'
import { getAccount } from '@/sync/state'

const ALARM = 'tabcabin:sync'

export const syncEngine = new SyncEngine()

/**
 * Keeps the extension in sync while an account is connected: pushes shortly after local
 * edits, listens to the server's change events, and checks every minute in case the
 * service worker was asleep.
 */
export function startSync() {
  liveQuery(getAccount).subscribe({
    next: (account) => {
      void syncEngine.setAccount(account)
      if (account?.token && account.initialized)
        void browser.alarms.create(ALARM, { periodInMinutes: 1 })
      else void browser.alarms.clear(ALARM)
    },
    error: (error) => console.error(error),
  })
  liveQuery(() => db.outbox.count()).subscribe({
    next: (count) => {
      if (count > 0) syncEngine.schedulePush()
    },
  })
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM) return
    void syncEngine.syncNow()
    syncEngine.startLive()
  })
}
