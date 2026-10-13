import { Button } from '@tabcabin/ui'
import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { useT } from '@/i18n'
import { IMPORT_ACCEPT } from '../shared/useImportFile'
import type { SketchGroup } from './BoardSketch'
import { StartCard } from './StartCard'
import type { StartChoice } from './start'

const STARTER: SketchGroup[] = [
  { emoji: '🌍', lines: 3 },
  { emoji: '📥', lines: 4 },
  { emoji: '👋', lines: 2 },
]

/** The second step: the starter board, an empty one, or a file from another tab manager. */
export function StartStep(props: {
  choice: StartChoice
  onChoose: (choice: StartChoice) => void
  onImport: (file: File) => void
  busy: boolean
}) {
  const t = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StartCard
          title={t('onboarding.starter')}
          text={t('onboarding.starterText')}
          groups={STARTER}
          selected={props.choice === 'starter'}
          onSelect={() => props.onChoose('starter')}
        />
        <StartCard
          title={t('onboarding.empty')}
          text={t('onboarding.emptyText')}
          groups={[]}
          selected={props.choice === 'empty'}
          onSelect={() => props.onChoose('empty')}
        />
      </div>
      <div className="flex items-center gap-3.5 rounded-[14px] bg-subtle px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-ink-2 shadow-tile">
          <Upload size={18} />
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-3">
          <span className="block text-[14px] font-semibold text-ink">{t('onboarding.moveIn')}</span>
          {t('onboarding.moveInText')}
        </span>
        <input
          ref={fileInput}
          type="file"
          accept={IMPORT_ACCEPT}
          aria-label={t('onboarding.importFile')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) props.onImport(file)
          }}
        />
        <Button size="sm" disabled={props.busy} onClick={() => fileInput.current?.click()}>
          {t('onboarding.importFile')}
        </Button>
      </div>
    </div>
  )
}
