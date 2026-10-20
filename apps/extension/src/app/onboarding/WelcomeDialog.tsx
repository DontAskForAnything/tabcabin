import { Button, Modal } from '@tabcabin/ui'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { removeStarter } from '@/db/onboarding'
import { useLocale, useT } from '@/i18n'
import { openSignInPage } from '@/lib/pages'
import { useImportFile } from '../shared/useImportFile'
import type { ActiveContext } from '../useActive'
import type { TemplateId } from '@/data/templates'
import { type StartChoice, startWith } from './start'
import { StartStep } from './StartStep'
import { StepDots } from './StepDots'
import { TipsStep } from './TipsStep'
import { WelcomeStep } from './WelcomeStep'

/**
 * Three short steps: what TabCabin is, how to start, and how to fill the boards. A template
 * added from the website already answered how to start, so that step is left out.
 */
export function WelcomeDialog({
  open,
  active,
  startedWith,
  onFinish,
}: {
  open: boolean
  active: ActiveContext
  startedWith?: TemplateId
  onFinish: () => Promise<void>
}) {
  const t = useT()
  const locale = useLocale()
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState<StartChoice>('starter')
  const [busy, setBusy] = useState(false)
  const importFile = useImportFile()
  const getStarted = useRef<HTMLButtonElement>(null)

  const run = async (task: () => Promise<boolean>) => {
    setBusy(true)
    try {
      if (await task()) setStep(2)
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(async () => {
      await startWith(choice, { t, locale, settings: active.settings })
      return true
    })

  const moveIn = (file: File) =>
    run(async () => {
      if (!(await importFile(file))) return false
      await removeStarter()
      return true
    })

  const signIn = async () => {
    await onFinish()
    openSignInPage(true)
  }

  const steps = startedWith ? [0, 2] : [0, 1, 2]
  const titles = [t('onboarding.title'), t('onboarding.startTitle'), t('onboarding.tipsTitle')]

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && void onFinish()}
      title={titles[step]}
      initialFocus={getStarted}
      footer={
        <>
          <StepDots step={steps.indexOf(step)} total={steps.length} />
          {step === 0 && (
            <Button ref={getStarted} variant="primary" onClick={() => setStep(steps[1]!)}>
              {t('onboarding.getStarted')}
            </Button>
          )}
          {step === 1 && (
            <>
              <Button variant="ghost" disabled={busy} onClick={() => setStep(0)}>
                {t('onboarding.back')}
              </Button>
              <Button variant="primary" disabled={busy} onClick={() => void start()}>
                {t('onboarding.continue')}
              </Button>
            </>
          )}
          {step === 2 && (
            <Button variant="primary" onClick={() => void onFinish()}>
              {t('common.done')}
            </Button>
          )}
        </>
      }
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {step === 0 && <WelcomeStep />}
        {step === 1 && (
          <StartStep choice={choice} onChoose={setChoice} onImport={moveIn} busy={busy} />
        )}
        {step === 2 && <TipsStep settings={active.settings} onSignIn={() => void signIn()} />}
      </motion.div>
    </Modal>
  )
}
