import { useT } from '@/i18n'
import { SELF_HOSTING_DOCS } from '@/lib/links'
import { useSyncServer } from '@/sync/server'
import { useAccount } from '@/sync/state'
import { ConnectedAccount } from './ConnectedAccount'
import { SignedOutAccount } from './SignedOutAccount'

/** Settings tab: who is signed in and how syncing goes. Signing in has its own page. */
export function AccountSettings() {
  const t = useT()
  const account = useAccount()
  const server = useSyncServer()
  if (account === undefined || server === undefined) return null

  return (
    <>
      {account?.token && account.initialized ? (
        <ConnectedAccount account={account} />
      ) : server ? (
        <SignedOutAccount expired={!!account && !account.token} />
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
