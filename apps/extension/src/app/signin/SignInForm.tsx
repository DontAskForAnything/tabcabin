import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/i18n'
import { openBoards } from '@/lib/pages'
import type { SignedIn, SyncClient } from '@/sync/client'
import { useServerHealth } from '@/sync/useServerHealth'
import { FormError } from './FormError'
import { GoogleButton } from './GoogleButton'
import { PasswordForm } from './PasswordForm'
import { type SignInMethod, useSignIn } from './useSignIn'

/**
 * Google first (simpler for people, and fewer fake accounts); username and password stay one
 * small click away, or are shown right away on servers without Google.
 */
export function SignInForm({
  server,
  expired,
  onSignedIn,
}: {
  server: string
  expired: boolean
  onSignedIn: (client: SyncClient, result: SignedIn, via: SignInMethod) => Promise<void>
}) {
  const t = useT()
  const health = useServerHealth(server)
  const signIn = useSignIn(server, onSignedIn)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const ready = health.state === 'ok' ? health : null
  const google = ready?.google ?? false

  return (
    <div className="flex flex-col">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">{t('signin.title')}</h1>
      <p className="mt-1.5 text-[14.5px] text-ink-3">{t('signin.subtitle')}</p>
      {health.state === 'down' && <FormError>{t('signin.unavailable')}</FormError>}
      {expired && (
        <p className="mt-5 rounded-[11px] bg-subtle px-3.5 py-2.5 text-[13px] text-ink-2">
          {t('sync.sessionExpired')}
        </p>
      )}

      {google && (
        <div className="mt-8">
          <GoogleButton disabled={signIn.busy} onClick={signIn.withGoogle} />
          {signIn.error?.from === 'google' && <FormError>{signIn.error.text}</FormError>}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
            {t(ready?.signup ? 'signin.googleNew' : 'signin.inviteGoogle')}
          </p>
          {!passwordOpen && (
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="mt-7 text-[13px] font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              {t('sync.orPassword')}
            </button>
          )}
        </div>
      )}

      {ready && (!google || passwordOpen) && (
        <div className={google ? 'mt-7 border-t border-line pt-6' : 'mt-8'}>
          <PasswordForm
            signupOpen={ready.signup}
            busy={signIn.busy}
            error={signIn.error?.from === 'password' ? signIn.error.text : null}
            onSubmit={signIn.withPassword}
            onModeChange={signIn.clearError}
          />
          {!google && !ready.signup && (
            <p className="mt-5 text-[13px] leading-relaxed text-ink-3">{t('signin.invite')}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={openBoards}
        className="mt-10 flex w-fit items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink"
      >
        {t('signin.later')} <ArrowRight size={14} />
      </button>
    </div>
  )
}
