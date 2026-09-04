import { Cloud, CloudOff, LogOut, RefreshCw, Server, Upload, Download } from 'lucide-react'
import { Button, cn, Field, toast } from '@tabhangar/ui'
import { type ReactNode, useEffect, useState } from 'react'
import { type Translate, useLocale, useT } from '@/i18n'
import { relativeTime } from '@/lib/time'
import { ApiError, SyncClient } from '@/sync/client'
import { firstSync, localHasData } from '@/sync/engine'
import {
  type Account,
  INITIAL_STATE,
  normalizeServerUrl,
  setAccount,
  type SyncState,
  updateSyncState,
  useAccount,
  usePendingCount,
  useSyncState,
} from '@/sync/state'
import { SectionTitle } from './Row'

const SELF_HOSTING_DOCS =
  'https://github.com/DontAskForAnything/tabhangar/blob/main/docs/self-hosting.md'

function deviceLabel(): string {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    'browser'
  return `TabHangar · ${platform}`
}

function errorText(error: unknown, t: Translate): string {
  if (!(error instanceof ApiError)) return t('sync.error.generic', { code: String(error) })
  switch (error.code) {
    case 'invalid_credentials':
    case 'signup_disabled':
    case 'username_taken':
    case 'invalid_request':
    case 'network':
      return t(`sync.error.${error.code}`)
    case 'too_many_attempts':
      return t('sync.error.too_many_attempts', { seconds: error.retryAfter ?? 60 })
    default:
      return t('sync.error.generic', { code: error.code })
  }
}

/** Settings tab: connect to a self-hosted server and see the sync status. */
export function AccountSettings() {
  const t = useT()
  const account = useAccount()
  const [choice, setChoice] = useState<{ client: SyncClient; account: Account } | null>(null)
  if (account === undefined) return null

  return (
    <>
      <SectionTitle>{t('settings.tab.account')}</SectionTitle>
      {choice ? (
        <FirstSyncChoice {...choice} onDone={() => setChoice(null)} />
      ) : account?.token && account.initialized ? (
        <Connected account={account} />
      ) : (
        <SignInForm previous={account} onChoice={setChoice} />
      )}
    </>
  )
}

type Health = { state: 'idle' | 'checking' | 'down' } | { state: 'ok'; version: string }

function useServerHealth(input: string): Health {
  const [health, setHealth] = useState<Health>({ state: 'idle' })
  useEffect(() => {
    const url = normalizeServerUrl(input)
    if (!url) {
      setHealth({ state: 'idle' })
      return
    }
    setHealth({ state: 'checking' })
    let cancelled = false
    const timer = setTimeout(() => {
      new SyncClient(url)
        .health()
        .then((res) =>
          setHealth(
            !cancelled && res.name === 'tabhangar'
              ? { state: 'ok', version: res.version }
              : { state: 'down' },
          ),
        )
        .catch(() => !cancelled && setHealth({ state: 'down' }))
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [input])
  return health
}

function SignInForm({
  previous,
  onChoice,
}: {
  previous: Account | null
  onChoice: (choice: { client: SyncClient; account: Account }) => void
}) {
  const t = useT()
  const [server, setServer] = useState(previous?.serverUrl ?? '')
  const [username, setUsername] = useState(previous?.user.username ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const health = useServerHealth(server)
  const expired = !!previous && !previous.token

  const submit = async (signup: boolean) => {
    const url = normalizeServerUrl(server)
    if (!url || !username || !password) return
    setBusy(true)
    setError(null)
    try {
      const client = new SyncClient(url)
      const result = await client.login(username, password, deviceLabel(), signup)
      const account: Account = {
        serverUrl: url,
        token: result.token,
        user: result.user,
        initialized: false,
      }
      const sameAccount =
        previous?.initialized && previous.serverUrl === url && previous.user.id === result.user.id
      if (sameAccount) {
        await setAccount({ ...account, initialized: true })
      } else {
        const [local, remote] = await Promise.all([localHasData(), client.pull(0, 1)])
        if (local && remote.changes.length > 0) {
          onChoice({ client, account })
          return
        }
        await firstSync(client, remote.changes.length > 0 ? 'server' : 'merge')
        await setAccount({ ...account, initialized: true })
      }
      toast({ title: t('sync.connected'), tone: 'success' })
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <p className="text-[13.5px] leading-relaxed text-ink-3">
        {t('sync.intro')}{' '}
        <a
          href={SELF_HOSTING_DOCS}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-accent-ink hover:underline"
        >
          {t('sync.howTo')}
        </a>
      </p>
      {expired && (
        <p className="rounded-[11px] bg-subtle px-3.5 py-2.5 text-[13px] text-ink-2">
          {t('sync.sessionExpired')}
        </p>
      )}
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(false)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Field
            label={t('sync.server')}
            value={server}
            onChange={(event) => setServer(event.target.value)}
            placeholder={t('sync.serverPlaceholder')}
            autoComplete="url"
            inputMode="url"
            spellCheck={false}
          />
          <ServerHealth health={health} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('sync.username')}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            spellCheck={false}
          />
          <Field
            label={t('sync.password')}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !server || !username || !password}
          >
            {busy ? t('sync.signingIn') : t('sync.signIn')}
          </Button>
          <Button
            disabled={busy || !server || !username || !password}
            onClick={() => void submit(true)}
          >
            {t('sync.signUp')}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ServerHealth({ health }: { health: Health }) {
  const t = useT()
  if (health.state === 'idle') return null
  const tone =
    health.state === 'ok' ? 'bg-success' : health.state === 'down' ? 'bg-danger' : 'bg-ink-4'
  return (
    <span className="flex items-center gap-2 text-[12.5px] text-ink-3" role="status">
      <span className={cn('size-2 rounded-full', tone)} />
      {health.state === 'ok'
        ? t('sync.serverOk', { version: health.version })
        : health.state === 'down'
          ? t('sync.serverDown')
          : t('sync.serverChecking')}
    </span>
  )
}

function FirstSyncChoice({
  client,
  account,
  onDone,
}: {
  client: SyncClient
  account: Account
  onDone: () => void
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const run = async (mode: 'merge' | 'server') => {
    setBusy(true)
    try {
      await firstSync(client, mode)
      await setAccount({ ...account, initialized: true })
      toast({ title: t('sync.connected'), tone: 'success' })
      onDone()
    } catch (error) {
      toast({ title: errorText(error, t), tone: 'error' })
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-3 pt-1">
      <h4 className="text-[15px] font-semibold">{t('sync.choiceTitle')}</h4>
      <p className="text-[13.5px] text-ink-3">{t('sync.choiceHint')}</p>
      <ChoiceButton
        icon={<Upload size={18} />}
        title={t('sync.merge')}
        hint={t('sync.mergeHint')}
        disabled={busy}
        onClick={() => void run('merge')}
      />
      <ChoiceButton
        icon={<Download size={18} />}
        title={t('sync.useServer')}
        hint={t('sync.useServerHint')}
        disabled={busy}
        onClick={() => void run('server')}
      />
    </div>
  )
}

function ChoiceButton(props: {
  icon: ReactNode
  title: string
  hint: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="flex items-center gap-3.5 rounded-[14px] border border-line bg-card px-4 py-3.5 text-left shadow-tile transition-[border-color,box-shadow] hover:border-accent/50 disabled:opacity-50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
        {props.icon}
      </span>
      <span>
        <span className="block text-[14px] font-semibold">{props.title}</span>
        <span className="block text-[12.5px] text-ink-3">{props.hint}</span>
      </span>
    </button>
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
          <div className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-3">
            <Server size={12} />
            {host}
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

      <div className="flex gap-2">
        <Button
          icon={<RefreshCw size={15} />}
          onClick={() => void browser.runtime.sendMessage({ type: 'tabhangar:sync-now' })}
        >
          {t('sync.syncNow')}
        </Button>
        <Button
          variant="ghost"
          icon={<LogOut size={15} />}
          className="text-danger hover:text-danger"
          onClick={() => void signOut()}
        >
          {t('sync.signOut')}
        </Button>
      </div>
      <p className="text-[12.5px] text-ink-3">{t('sync.signOutHint')}</p>
    </div>
  )
}
