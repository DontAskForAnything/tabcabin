import type { SyncState } from './state'

/** Colour of the little status dot for each sync state. */
export const SYNC_STATUS_DOT: Record<SyncState['status'], string> = {
  idle: 'bg-ink-4',
  syncing: 'bg-warning',
  synced: 'bg-success',
  offline: 'bg-warning',
  error: 'bg-danger',
  'signed-out': 'bg-ink-4',
}
