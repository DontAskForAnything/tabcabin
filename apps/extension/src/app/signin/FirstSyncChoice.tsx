import { Download, Upload } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useT } from '@/i18n'
import { firstSync } from '@/sync/firstSync'
import type { PendingChoice } from '@/sync/session'
import { setAccount } from '@/sync/state'
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
      className="flex items-center gap-3.5 rounded-[14px] border border-line bg-card px-4 py-3.5 text-left shadow-tile transition-[border-color,box-shadow] outline-none hover:border-accent/50 focus-visible:shadow-[0_0_0_2px_var(--focus)] disabled:opacity-50"
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
