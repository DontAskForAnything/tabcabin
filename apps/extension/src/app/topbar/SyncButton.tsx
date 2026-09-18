import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { IconButton, Tooltip, cn } from '@tabhangar/ui'
import { useLocale, useT } from '@/i18n'
import { openSignInPage } from '@/lib/pages'
import { relativeTime } from '@/lib/time'
import { useSyncServer } from '@/sync/server'
import { INITIAL_STATE, useAccount, useSyncState } from '@/sync/state'
import { SYNC_STATUS_DOT } from '@/sync/statusColors'
import { useUi } from '@/state/ui'

/**
 * Sync at a glance: "Sign in" while signed out, otherwise the live status (syncing runs on its
 * own; the button only opens the details).
 */
export function SyncButton({ compact, hideLabel }: { compact: boolean; hideLabel: string }) {
  const t = useT()
  const locale = useLocale()
  const server = useSyncServer()
  const account = useAccount()
  const state = useSyncState() ?? INITIAL_STATE
  const openModal = useUi((s) => s.openModal)
  if (!server || account === undefined) return null

  if (!account?.token || !account.initialized) {
    return (
      <Tooltip label={t('sync.signInToSync')}>
        <button
          type="button"
          aria-label={t('sync.signInToSync')}
          onClick={() => openSignInPage(!compact)}
          className="flex h-10 items-center gap-2 rounded-xl bg-card px-3 text-[13px] font-medium text-ink-2 shadow-tile transition-colors hover:text-ink"
        >
          <CloudOff size={16} />
          {!compact && <span className={hideLabel}>{t('sync.signIn')}</span>}
        </button>
      </Tooltip>
    )
  }

  const status = t(`sync.status.${state.status}`)
  const label = state.lastSyncAt ? `${status} · ${relativeTime(state.lastSyncAt, locale)}` : status
  const Icon =
    state.status === 'syncing'
      ? RefreshCw
      : state.status === 'offline' || state.status === 'error'
        ? CloudOff
        : Cloud
  return (
    <IconButton
      label={label}
      variant="tile"
      size="lg"
      onClick={() => openModal({ type: 'settings', tab: 'account' })}
      icon={
        <span className="relative flex">
          <Icon
            size={17}
            className={cn(state.status === 'syncing' && 'motion-safe:animate-spin')}
          />
          <span
            className={cn(
              'absolute -right-1 -bottom-0.5 size-2 rounded-full ring-2 ring-card',
              SYNC_STATUS_DOT[state.status],
            )}
          />
        </span>
      }
    />
  )
}
