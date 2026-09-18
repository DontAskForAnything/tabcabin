import { Cloud, CloudOff, LogIn, LogOut, Server } from 'lucide-react'
import { Button, cn, toast } from '@tabhangar/ui'
import { useLocale, useT } from '@/i18n'
import { relativeTime } from '@/lib/time'
import { SyncClient } from '@/sync/client'
import { useSyncServer } from '@/sync/server'
import {
  type Account,
  INITIAL_STATE,
  setAccount,
  type SyncState,
  updateSyncState,
  useAccount,
  usePendingCount,
  useSyncState,
} from '@/sync/state'
import { openSignInPage } from '../signin/connect'
import { SectionTitle } from './Row'

const SELF_HOSTING_DOCS =
  'https://github.com/DontAskForAnything/tabhangar/blob/main/docs/self-hosting.md'

/** Settings tab: who is signed in and how syncing goes. Signing in has its own page. */
export function AccountSettings() {
  const t = useT()
  const account = useAccount()
  const server = useSyncServer()
  if (account === undefined || server === undefined) return null

  return (
    <>
      <SectionTitle>{t('settings.tab.account')}</SectionTitle>
      {account?.token && account.initialized ? (
        <Connected account={account} />
      ) : server ? (
        <SignedOut server={server} expired={!!account && !account.token} />
      ) : (
        <div className="flex flex-col gap-2 pt-1 text-[13.5px] leading-relaxed text-ink-3">
          <p>{t('signin.noServerText')}</p>
          <a
            href={SELF_HOSTING_DOCS}
            target="_blank"
            rel="noreferrer"
            className="w-fit font-medium text-accent-ink hover:underline"
          >
            {t('sync.howTo')}
          </a>
        </div>
      )}
    </>
  )
}

function SignedOut({ server, expired }: { server: string; expired: boolean }) {
  const t = useT()
  return (
    <div className="flex flex-col items-start gap-4 pt-1">
      <p className="text-[13.5px] leading-relaxed text-ink-3">{t('sync.intro')}</p>
      {expired && (
        <p className="rounded-[11px] bg-subtle px-3.5 py-2.5 text-[13px] text-ink-2">
          {t('sync.sessionExpired')}
        </p>
      )}
      <Button
        variant="primary"
        icon={<LogIn size={15} />}
        onClick={() => openSignInPage(location.pathname.endsWith('/newtab.html'))}
      >
        {t('sync.signIn')}
      </Button>
      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <Server size={12} />
        {new URL(server).host}
      </p>
    </div>
  )
}

const STATUS_DOT: Record<SyncState['status'], string> = {
  idle: 'bg-ink-4',
  syncing: 'bg-warning',
  synced: 'bg-success',
  offline: 'bg-warning',
  error: 'bg-danger',
  'signed-out': 'bg-ink-4',
}

function Connected({ account }: { account: Account }) {
  const t = useT()
  const locale = useLocale()
  const state = useSyncState() ?? INITIAL_STATE
  const pending = usePendingCount()
  const host = new URL(account.serverUrl).host

  const signOut = async () => {
    await new SyncClient(account.serverUrl, account.token).logout().catch(() => undefined)
    await setAccount(null)
    await updateSyncState(INITIAL_STATE)
    toast({ title: t('sync.signedOut'), tone: 'success' })
  }

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
            <div className="truncate text-[12.5px] text-ink-2">{account.user.email}</div>
          )}
          <div className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-3">
            <Server size={12} className="shrink-0" />
            <span className="truncate">{host}</span>
          </div>
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
          <span className={cn('size-2 rounded-full', STATUS_DOT[state.status])} />
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
        onClick={() => void signOut()}
      >
        {t('sync.signOut')}
      </Button>
      <p className="-mt-2 text-[12.5px] text-ink-3">{t('sync.signOutHint')}</p>
    </div>
  )
}
