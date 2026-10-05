import { ArrowDown, ArrowUp, Plus, Trash } from 'lucide-react'
import { Button, IconButton, Modal } from '@tabcabin/ui'
import { createCategory, deleteCategory, moveCategory, updateCategory } from '@/db/repo'
import { useT } from '@/i18n'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../useActive'

export function CategoriesManager({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const { categories, workspace } = active
  if (!workspace || !categories) return null

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('category.manage')}
      description={`${workspace.emoji} ${workspace.name}`}
      footer={
        <>
          <Button
            variant="soft"
            icon={<Plus size={15} />}
            className="mr-auto"
            onClick={() => void createCategory(workspace.id, t('category.defaultName'))}
          >
            {t('category.new')}
          </Button>
          <Button variant="primary" onClick={close}>
            {t('common.done')}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {categories.map((cat, index) => (
          <li key={cat.id} className="flex items-center gap-2 rounded-xl bg-subtle p-1.5 pl-3">
            <input
              defaultValue={cat.name}
              aria-label={t('category.rename')}
              onBlur={(event) => {
                const name = event.target.value.trim()
                if (name && name !== cat.name) void updateCategory(cat.id, { name })
              }}
              onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
              className="h-9 min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none"
            />
            <IconButton
              label={t('category.moveLeft')}
              icon={<ArrowUp size={15} />}
              size="md"
              disabled={index === 0}
              onClick={() =>
                void moveCategory(cat.id, { workspaceId: workspace.id, index: index - 1 })
              }
            />
            <IconButton
              label={t('category.moveRight')}
              icon={<ArrowDown size={15} />}
              size="md"
              disabled={index === categories.length - 1}
              onClick={() =>
                void moveCategory(cat.id, { workspaceId: workspace.id, index: index + 1 })
              }
            />
            <IconButton
              label={t('category.delete')}
              icon={<Trash size={15} />}
              size="md"
              disabled={categories.length <= 1}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: t('category.delete'),
                  description: t('category.deleteConfirm', { name: cat.name }),
                  confirmLabel: t('common.delete'),
                  cancelLabel: t('common.cancel'),
                  danger: true,
                })
                if (ok)
                  offerUndo(await deleteCategory(cat.id), {
                    title: t('category.deleted'),
                    undoLabel: t('common.undo'),
                  })
              }}
            />
          </li>
        ))}
      </ul>
    </Modal>
  )
}
