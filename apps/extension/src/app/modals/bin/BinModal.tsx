import { Button, Modal } from '@tabcabin/ui'
import { Trash, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useBin } from '@/db/bin'
import { BIN_LIMIT, emptyBin, trimBin } from '@/db/repo'
import { useT } from '@/i18n'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../../useActive'
import { BinRowView } from './BinRowView'

export function BinModal({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const rows = useBin(open)
  useEffect(() => {
    if (open) void trimBin()
  }, [open])

  const empty = async () => {
    if (!rows?.length) return
    const ok = await confirmDialog({
      title: t('bin.emptyBin'),
      description: t('bin.emptyConfirm', { count: rows.length }),
      confirmLabel: t('bin.emptyBin'),
      cancelLabel: t('common.cancel'),
      danger: true,
    })
    if (ok) offerUndo(await emptyBin(), { title: t('bin.emptied'), undoLabel: t('common.undo') })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('bin.title')}
      description={t('bin.description', { max: BIN_LIMIT })}
      size="md"
      footer={
        rows && rows.length > 0 ? (
          <>
            <Button
              variant="ghost"
              icon={<Trash size={15} />}
              className="mr-auto text-danger hover:text-danger"
              onClick={() => void empty()}
            >
              {t('bin.emptyBin')}
            </Button>
            <Button onClick={close}>{t('common.close')}</Button>
          </>
        ) : undefined
      }
    >
      {rows && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <div className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-subtle text-ink-3">
            <Trash2 size={26} />
          </div>
          <h3 className="text-[16px] font-semibold">{t('bin.empty')}</h3>
          <p className="max-w-[320px] text-[13.5px] text-ink-3">{t('bin.emptyHint')}</p>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {rows?.map((row) => (
          <BinRowView key={`${row.entity}:${row.row.id}`} row={row} active={active} />
        ))}
      </ul>
    </Modal>
  )
}
