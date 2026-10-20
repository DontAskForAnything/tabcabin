import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { finishOnboarding, getOnboarding } from '@/db/onboarding'
import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { WelcomeDialog } from './WelcomeDialog'

/** Shows the welcome dialog on the new tab page after the first start, until it is finished. */
export function Onboarding({ active }: { active: ActiveContext }) {
  const onboarding = useLiveQuery(getOnboarding, [])
  const modal = useUi((s) => s.modal)
  const [finished, setFinished] = useState(false)
  const pending = onboarding?.state === 'open' && !finished && active.ready

  useEffect(() => {
    // Another dialog (search opened with its shortcut, reminders from a notification) goes
    // first; the welcome comes back at the same step when it closes.
    if (pending && modal === null) useUi.getState().openModal({ type: 'welcome' })
    if (!pending && modal?.type === 'welcome') useUi.getState().closeModal()
  }, [pending, modal])

  const finish = async () => {
    setFinished(true)
    useUi.getState().closeModal()
    await finishOnboarding()
  }

  return (
    <WelcomeDialog
      open={pending && modal?.type === 'welcome'}
      active={active}
      startedWith={onboarding?.state === 'open' ? onboarding.template : undefined}
      onFinish={finish}
    />
  )
}
