import { Cloud, CloudOff, LogOut } from 'lucide-react'
import { Button, cn } from '@tabcabin/ui'
import { useState } from 'react'
import { useLocale, useT } from '@/i18n'
import { relativeTime } from '@/lib/time'
import { type Account, INITIAL_STATE, usePendingCount, useSyncState } from '@/sync/state'
import { SYNC_STATUS_DOT } from '@/sync/statusColors'
import { SignOutDialog } from './SignOutDialog'

/** The signed-in account and how syncing goes (it runs by itself; there is nothing to press). */
export function ConnectedAccount({ account }: { account: Account }) {
  const t = useT()
  const locale = useLocale()
  const state = useSyncState() ?? INITIAL_STATE
  const pending = usePendingCount()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex items-center gap-3.5 rounded-[16px] border border-line bg-card p-4 shadow-tile">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-[17px] font-semibold text-on-accent uppercase">
          {account.user.username.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold">
            {t('sync.connectedAs', { username: account.user.username })}
          </div>
          {account.user.email && (
            <div className="truncate text-[12.5px] text-ink-3">{account.user.email}</div>
          )}
        </div>
        {state.live ? (
          <Cloud size={18} className="text-success" aria-label={t('sync.live')} />
        ) : (
          <CloudOff size={18} className="text-ink-4" aria-hidden />
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13.5px]">
        <dt className="text-ink-3">{t('sync.statusLabel')}</dt>
        <dd className="flex items-center gap-2 font-medium" role="status">
          <span className={cn('size-2 rounded-full', SYNC_STATUS_DOT[state.status])} />
          {t(`sync.status.${state.status}`)}
        </dd>
        <dt className="text-ink-3">{t('sync.lastSyncLabel')}</dt>
        <dd className="text-ink-2">
          {state.lastSyncAt ? relativeTime(state.lastSyncAt, locale) : t('sync.never')}
          {pending > 0 && ` · ${t('sync.pending', { count: pending })}`}
        </dd>
      </dl>
      {state.status === 'error' && state.error === 'quota_exceeded' ? (
        <p className="rounded-[11px] bg-danger-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
          {t('sync.quotaFull')}
        </p>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-ink-3">{t('sync.automatic')}</p>
      )}

      <Button
        variant="ghost"
        icon={<LogOut size={15} />}
        className="w-fit text-danger hover:text-danger"
        onClick={() => setSigningOut(true)}
      >
        {t('sync.signOut')}
      </Button>
      <SignOutDialog account={account} open={signingOut} onOpenChange={setSigningOut} />
    </div>
  )
}
