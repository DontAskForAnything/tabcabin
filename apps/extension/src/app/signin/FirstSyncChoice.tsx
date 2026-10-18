import { Download, Upload } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/i18n'
import { firstSync } from '@/sync/firstSync'
import type { PendingChoice } from '@/sync/session'
import { setAccount } from '@/sync/state'
import { ChoiceButton } from '../shared/ChoiceButton'
import { errorText } from './errorText'

/** Asked once, when this browser and the account both have boards. */
export function FirstSyncChoice({ choice, onDone }: { choice: PendingChoice; onDone: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (mode: 'merge' | 'server') => {
    setBusy(true)
    setError(null)
    try {
      await firstSync(choice.client, mode)
      await setAccount({ ...choice.account, initialized: true })
      onDone()
    } catch (err) {
      setError(errorText(err, t))
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{t('sync.choiceTitle')}</h1>
      <p className="mb-2 text-[14px] leading-relaxed text-ink-3">{t('sync.choiceHint')}</p>
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
      {error && (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
