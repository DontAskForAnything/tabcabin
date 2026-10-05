import type { SyncState } from './state'

/** Colour of the little status dot for each sync state. */
export const SYNC_STATUS_DOT: Record<SyncState['status'], string> = {
  idle: 'bg-ink-4',
  syncing: 'bg-accent/50',
  synced: 'bg-success',
  offline: 'bg-ink-3',
  error: 'bg-danger',
  'signed-out': 'bg-ink-4',
}
