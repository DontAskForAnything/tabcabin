import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { normalizeServerUrl } from './state'

/*
 * The sync server is part of the build, not a setting: official builds sync with the TabCabin
 * server, and self-hosters build the extension with their own address in apps/extension/.env:
 *
 *   WXT_SYNC_SERVER=https://tabs.example.com
 *
 * An empty value builds the extension without sync.
 */
const DEFAULT_SYNC_SERVER = ''

const configured = import.meta.env.WXT_SYNC_SERVER ?? DEFAULT_SYNC_SERVER
const BUILD_SYNC_SERVER = normalizeServerUrl(configured)

/** End-to-end tests point the test build at the server they start (meta `test.syncServer`). */
const TEST_KEY = 'test.syncServer'

async function getSyncServer(): Promise<string | null> {
  if (import.meta.env.MODE === 'e2e') {
    const row = await db.meta.get(TEST_KEY)
    if (typeof row?.value === 'string') return normalizeServerUrl(row.value)
  }
  return BUILD_SYNC_SERVER
}

/** The sync server (undefined while loading, null when the build has none). */
export function useSyncServer(): string | null | undefined {
  return useLiveQuery(getSyncServer, [])
}
