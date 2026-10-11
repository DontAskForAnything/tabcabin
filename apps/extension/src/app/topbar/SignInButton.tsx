import { CloudOff } from 'lucide-react'
import { Tooltip } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { openSignInPage } from '@/lib/pages'
import { useSyncServer } from '@/sync/server'
import { useAccount } from '@/sync/state'

/**
 * "Sign in" while signed out (or when signing in again is needed). Once signed in, syncing runs
 * on its own and the top bar stays quiet; its status lives in Settings → Account & sync.
 */
export function SignInButton({ compact, hideLabel }: { compact: boolean; hideLabel: string }) {
  const t = useT()
  const server = useSyncServer()
  const account = useAccount()
  if (!server || account === undefined) return null
  if (account?.token && account.initialized) return null

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
