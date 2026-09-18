import { ArrowRight, Check } from 'lucide-react'
import { Button, cn, Field } from '@tabhangar/ui'
import { type ReactNode, useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { ApiError, type SignedIn, SyncClient } from '@/sync/client'
import { requestIdentityPermission, signInWithGoogle } from '@/sync/google'
import { useSyncServer } from '@/sync/server'
import { useAccount } from '@/sync/state'
import { HangarMark } from '../HangarMark'
import {
  completeSignIn,
  deviceLabel,
  errorText,
  type Health,
  openBoards,
  type PendingChoice,
  useServerHealth,
} from './connect'
import { FirstSyncChoice } from './FirstSyncChoice'
import { GoogleMark } from './GoogleMark'

const SELF_HOSTING_DOCS =
  'https://github.com/DontAskForAnything/tabhangar/blob/main/docs/self-hosting.md'

/** The sign-in page (signin.html): a picture of the boards on the left, the form on the right. */
export function SignInPage() {
  const server = useSyncServer()
  const account = useAccount()
  const [choice, setChoice] = useState<PendingChoice | null>(null)
  const [done, setDone] = useState(false)
  if (server === undefined || account === undefined) return null

  let content: ReactNode
  if (!server) content = <NoServer />
  else if (choice)
    content = (
      <FirstSyncChoice
        choice={choice}
        onDone={() => {
          setChoice(null)
          setDone(true)
        }}
      />
    )
  else if (done || (account?.token && account.initialized))
    content = <SignedInNote username={account?.user.username ?? ''} />
  else
    content = (
      <SignInForm
        server={server}
        expired={!!account && !account.token}
        onSignedIn={async (client, result) => {
          const pending = await completeSignIn(client, result, account)
          if (pending) setChoice(pending)
          else setDone(true)
        }}
      />
    )

  return (
    <div className="grid min-h-screen bg-panel text-ink lg:grid-cols-[minmax(0,1.07fr)_minmax(0,1fr)]">
      <Showcase />
      <main className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[380px]">{content}</div>
      </main>
    </div>
  )
}

function SignInForm({
  server,
  expired,
  onSignedIn,
}: {
  server: string
  expired: boolean
  onSignedIn: (client: SyncClient, result: SignedIn) => Promise<void>
}) {
  const t = useT()
  const health = useServerHealth(server)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ text: string; from: 'google' | 'password' } | null>(null)
  const ready = health.state === 'ok' ? health : null

  const connect = async (
    from: 'google' | 'password',
    signIn: (client: SyncClient) => Promise<SignedIn>,
  ) => {
    setBusy(true)
    setError(null)
    try {
      const client = new SyncClient(server)
      await onSignedIn(client, await signIn(client))
    } catch (err) {
      // Closing the Google window is not an error worth showing.
      if (!(err instanceof ApiError && err.code === 'cancelled'))
        setError({ text: errorText(err, t), from })
    } finally {
      setBusy(false)
    }
  }

  const google = () => {
    // Ask before anything else: the prompt needs the click's user gesture.
    const granted = requestIdentityPermission()
    void connect('google', async (client) => {
      if (!(await granted)) throw new ApiError(0, 'permission')
      return signInWithGoogle(client, deviceLabel())
    })
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">
        {creating ? t('signin.createTitle') : t('signin.title')}
      </h1>
      <p className="mt-1.5 text-[14.5px] text-ink-3">{t('signin.subtitle')}</p>
      <ServerLine server={server} health={health} />

      {expired && (
        <p className="mt-5 rounded-[11px] bg-subtle px-3.5 py-2.5 text-[13px] text-ink-2">
          {t('sync.sessionExpired')}
        </p>
      )}

      {ready?.google && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={google}
            className="mt-7 flex h-12 items-center justify-center gap-3 rounded-[12px] border border-line bg-card text-[14.5px] font-semibold shadow-tile transition-[border-color,box-shadow] outline-none hover:border-ink-4 focus-visible:shadow-[0_0_0_2px_var(--focus)] disabled:opacity-50"
          >
            <GoogleMark />
            {t('sync.google')}
          </button>
          {error?.from === 'google' && <ErrorText>{error.text}</ErrorText>}
          <div className="my-6 flex items-center gap-3 text-[12px] text-ink-3">
            <span className="h-px flex-1 bg-line" />
            {t('sync.orPassword')}
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form
        className={cn('flex flex-col gap-4', !ready?.google && 'mt-7')}
        onSubmit={(event) => {
          event.preventDefault()
          if (!username || !password) return
          void connect('password', (client) =>
            client.login(username, password, deviceLabel(), creating),
          )
        }}
      >
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
          autoComplete={creating ? 'new-password' : 'current-password'}
        />
        {error?.from === 'password' && <ErrorText>{error.text}</ErrorText>}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-1 w-full"
          disabled={busy || !ready || !username || !password}
        >
          {busy && error === null
            ? t('sync.signingIn')
            : creating
              ? t('sync.signUp')
              : t('sync.signIn')}
        </Button>
      </form>

      <p className="mt-5 text-[13px] leading-relaxed text-ink-3">
        {ready?.signup ? (
          <button
            type="button"
            className="font-medium text-accent-ink hover:underline"
            onClick={() => {
              setCreating((value) => !value)
              setError(null)
            }}
          >
            {creating ? t('signin.haveAccount') : t('signin.noAccount')}
          </button>
        ) : (
          t(ready?.google ? 'signin.inviteGoogle' : 'signin.invite')
        )}
      </p>
      <button
        type="button"
        onClick={openBoards}
        className="mt-8 flex w-fit items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink"
      >
        {t('signin.later')} <ArrowRight size={14} />
      </button>
    </div>
  )
}

function ServerLine({ server, health }: { server: string; health: Health }) {
  const t = useT()
  const tone =
    health.state === 'ok' ? 'bg-success' : health.state === 'down' ? 'bg-danger' : 'bg-ink-4'
  return (
    <p className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-3" role="status">
      <span className={cn('size-2 shrink-0 rounded-full', tone)} />
      {health.state === 'down'
        ? t('signin.serverDown', { host: new URL(server).host })
        : t('signin.server', { host: new URL(server).host })}
    </p>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[13px] leading-snug font-medium text-danger">
      {children}
    </p>
  )
}

function SignedInNote({ username }: { username: string }) {
  const t = useT()
  // Head back to the boards on their own after a moment.
  useEffect(() => {
    const timer = setTimeout(openBoards, 2500)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="flex flex-col items-start">
      <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        <Check size={24} strokeWidth={2.5} />
      </span>
      <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.025em]">
        {t('signin.doneTitle')}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">
        {t('signin.doneText', { username })}
      </p>
      <Button variant="primary" size="lg" className="mt-7" onClick={openBoards}>
        {t('signin.openBoards')}
      </Button>
    </div>
  )
}

function NoServer() {
  const t = useT()
  return (
    <div className="flex flex-col items-start">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">{t('signin.noServerTitle')}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{t('signin.noServerText')}</p>
      <a
        href={SELF_HOSTING_DOCS}
        target="_blank"
        rel="noreferrer"
        className="mt-3 text-[14px] font-medium text-accent-ink hover:underline"
      >
        {t('sync.howTo')}
      </a>
      <Button variant="primary" size="lg" className="mt-7" onClick={openBoards}>
        {t('signin.openBoards')}
      </Button>
    </div>
  )
}

/** The left half: a few board cards and the promise, as in the design. */
function Showcase() {
  const t = useT()
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#5646dc,#4335c4_55%,#382aa8)] p-12 text-white lg:flex">
      <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.14),transparent)]" />
      <div className="relative flex items-center gap-3 text-[20px] font-semibold tracking-[-0.01em]">
        <span className="flex size-11 items-center justify-center rounded-[13px] bg-white text-accent shadow-[0_8px_24px_-8px_rgb(10_5_40/0.5)]">
          <HangarMark size={22} />
        </span>
        TabHangar
      </div>

      <div className="relative mx-auto h-[300px] w-full max-w-[520px]" aria-hidden>
        <PreviewCard className="top-[46px] left-0 w-[290px] -rotate-[5deg]">
          <CardHead emoji="🌍" title={t('seed.quickLinks')} meta={t('signin.cardLinks')} />
          <PreviewLink letter="G" color="#24292f" title="Pull requests" />
          <PreviewLink letter="Y" color="#e5484d" title={t('signin.cardWatch')} />
        </PreviewCard>
        <PreviewCard className="top-0 left-[210px] z-10 w-[275px] rotate-[3deg]">
          <CardHead emoji="📥" title={t('seed.today')} meta={t('signin.cardTasks')} />
          <PreviewTask done text={t('signin.task1')} />
          <PreviewTask text={t('signin.task2')} />
          <div className="mt-2 rounded-[10px] bg-[#fde68a] px-3 py-2 text-[12.5px] text-[#5b4a14]">
            {t('signin.task3')}
          </div>
        </PreviewCard>
        <PreviewCard className="top-[200px] left-[100px] w-[262px] rotate-[1deg]">
          <CardHead emoji="📚" title={t('seed.readLater')} meta={t('signin.cardPages')} />
        </PreviewCard>
      </div>

      <div className="relative">
        <h2 className="text-[36px] leading-[1.1] font-semibold tracking-[-0.03em]">
          {t('signin.headline')}
        </h2>
        <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-white/75">
          {t('signin.lead')}
        </p>
      </div>
    </aside>
  )
}

function PreviewCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'absolute rounded-[18px] bg-white p-4 text-[#1c1d22] shadow-[0_24px_50px_-18px_rgb(10_5_40/0.55)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function CardHead({ emoji, title, meta }: { emoji: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[26px] leading-none">{emoji}</span>
      <span>
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[11.5px] text-[#6b6f7a]">{meta}</span>
      </span>
    </div>
  )
}

function PreviewLink({ letter, color, title }: { letter: string; color: string; title: string }) {
  return (
    <div className="mt-3 flex items-center gap-2.5 text-[13px] font-medium">
      <span
        className="flex size-7 items-center justify-center rounded-lg text-[12px] font-bold text-white"
        style={{ background: color }}
      >
        {letter}
      </span>
      {title}
    </div>
  )
}

function PreviewTask({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div className="mt-2.5 flex items-center gap-2.5 text-[13px]">
      <span
        className={cn(
          'flex size-[18px] items-center justify-center rounded-[5px] border',
          done ? 'border-[#5b4be0] bg-[#5b4be0] text-white' : 'border-[#c9ccd4]',
        )}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </span>
      <span className={done ? 'text-[#8b8f99] line-through' : ''}>{text}</span>
    </div>
  )
}
