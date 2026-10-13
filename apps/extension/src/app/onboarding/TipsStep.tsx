import { Button } from '@tabcabin/ui'
import { BookmarkPlus, Cloud, Inbox, PanelLeft, Pin, Search } from 'lucide-react'
import { useT } from '@/i18n'
import { formatShortcut } from '@/lib/keys'
import { DEFAULT_SETTINGS, type Settings } from '@/settings/settings'
import { useSyncServer } from '@/sync/server'
import { useAccount } from '@/sync/state'
import { useCommandShortcut } from '../shared/useCommandShortcut'
import { TipRow } from './TipRow'

/** The last step: the ways to fill the boards, and signing in when the build can sync. */
export function TipsStep({
  settings,
  onSignIn,
}: {
  settings: Settings | undefined
  onSignIn: () => void
}) {
  const t = useT()
  const saveKeys = useCommandShortcut('_execute_action')
  const inboxKeys = useCommandShortcut('save-to-inbox')
  const server = useSyncServer()
  const account = useAccount()
  const shortcuts = settings?.shortcuts ?? DEFAULT_SETTINGS.shortcuts
  const canSignIn = Boolean(server) && account !== undefined && !account?.token

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-3.5">
        <TipRow icon={<PanelLeft size={18} />}>{t('onboarding.tipDrag')}</TipRow>
        <TipRow icon={<BookmarkPlus size={18} />} keys={saveKeys}>
          {t('onboarding.tipSave')}
        </TipRow>
        <TipRow icon={<Inbox size={18} />} keys={inboxKeys}>
          {t('onboarding.tipInbox')}
        </TipRow>
        <TipRow icon={<Search size={18} />} keys={formatShortcut(shortcuts.search)}>
          {t('onboarding.tipSearch')}
        </TipRow>
        <TipRow icon={<Pin size={18} />}>{t('onboarding.tipPin')}</TipRow>
      </ul>
      {canSignIn && (
        <div className="flex items-center gap-3.5 rounded-[14px] bg-subtle px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-ink-2 shadow-tile">
            <Cloud size={18} />
          </span>
          <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-3">
            <span className="block text-[14px] font-semibold text-ink">
              {t('onboarding.syncTitle')}
            </span>
            {t('onboarding.syncText')}
          </span>
          <Button size="sm" onClick={onSignIn}>
            {t('sync.signIn')}
          </Button>
        </div>
      )}
    </div>
  )
}
