import { Button, Modal, toast } from '@tabcabin/ui'
import { Info, Laptop, LoaderCircle, Users } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/i18n'
import type { Account } from '@/sync/state'
import { ChoiceButton } from '../../shared/ChoiceButton'
import { requestSignOut } from './requestSignOut'

type Running = 'keep' | 'remove' | 'retry' | 'force'

/**
 * Signing out asks whose computer this is: on your own the boards stay, on a borrowed or shared
 * one everything TabCabin stored here is removed (the account keeps it all). When some changes
 * could not reach the account yet, it asks once more before removing them.
 */
export function SignOutDialog({
  account,
  open,
  onOpenChange,
}: {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const [running, setRunning] = useState<Running | null>(null)
  const [pending, setPending] = useState<number | null>(null)

  const run = async (step: Running) => {
    const remove = step !== 'keep'
    setRunning(step)
    const result = await requestSignOut({ remove, force: step === 'force' })
    setRunning(null)
    if (result.ok) {
      if (!remove) toast({ title: t('sync.signedOut'), tone: 'success' })
      return
    }
    if (result.pending > 0) setPending(result.pending)
    else toast({ title: t('signOut.failed'), tone: 'error' })
  }

  const close = (value: boolean) => {
    if (value || running) return
    onOpenChange(false)
    setPending(null)
  }

  if (pending !== null)
    return (
      <Modal
        open={open}
        onOpenChange={close}
        title={t('signOut.pendingTitle')}
        description={t('signOut.pendingText', { count: pending })}
        size="md"
        footer={
          <>
            <Button variant="danger" disabled={!!running} onClick={() => void run('force')}>
              {t('signOut.removeAnyway')}
            </Button>
            <Button
              variant="primary"
              disabled={!!running}
              icon={
                running === 'retry' ? (
                  <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
                ) : undefined
              }
              onClick={() => void run('retry')}
            >
              {t('signOut.retry')}
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    )

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={t('sync.signOut')}
      description={t('signOut.question')}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <ChoiceButton
          icon={<Laptop size={18} />}
          title={t('signOut.mine')}
          hint={t('signOut.mineHint')}
          disabled={!!running}
          busy={running === 'keep'}
          onClick={() => void run('keep')}
        />
        <ChoiceButton
          icon={<Users size={18} />}
          title={t('signOut.shared')}
          hint={t('signOut.sharedHint')}
          disabled={!!running}
          busy={running === 'remove'}
          onClick={() => void run('remove')}
        />
        {account.via === 'google' && (
          <p className="flex gap-2 pt-1 text-[12.5px] leading-relaxed text-ink-3">
            <Info size={14} className="mt-[3px] shrink-0" aria-hidden />
            {t('signOut.google')}
          </p>
        )}
      </div>
    </Modal>
  )
}
