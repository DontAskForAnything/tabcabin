import { Button, Modal } from '@tabcabin/ui'
import { useConfirm } from '@/state/confirm'

export function ConfirmHost() {
  const request = useConfirm((s) => s.request)
  const settle = useConfirm((s) => s.settle)
  return (
    <Modal
      open={request !== null}
      onOpenChange={(open) => !open && settle(false)}
      title={request?.title ?? ''}
      description={request?.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => settle(false)}>
            {request?.cancelLabel}
          </Button>
          <Button
            variant={request?.danger ? 'danger' : 'primary'}
            onClick={() => settle(true)}
            autoFocus
          >
            {request?.confirmLabel}
          </Button>
        </>
      }
    >
      <span />
    </Modal>
  )
}
