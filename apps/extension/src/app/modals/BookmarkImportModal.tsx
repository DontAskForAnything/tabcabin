import { Folder } from 'lucide-react'
import { Button, Checkbox, cn, Modal, toast } from '@tabhangar/ui'
import { useEffect, useState } from 'react'
import { addGroupWithLinks, type BookmarkFolder, loadBookmarkFolders } from '@/data/browserLinks'
import type { Change } from '@tabhangar/core'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import { hasBookmarkAccess, requestBookmarkAccess } from '../search/bookmarks'
import type { ActiveContext } from '../useActive'

/** Picks bookmark folders and turns each into a group in the current category. */
export function BookmarkImportModal({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const [access, setAccess] = useState<boolean | null>(null)
  const [folders, setFolders] = useState<BookmarkFolder[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setSelected([])
    setFolders(null)
    void hasBookmarkAccess().then(setAccess)
  }, [open])
  useEffect(() => {
    if (open && access) void loadBookmarkFolders().then(setFolders)
  }, [open, access])

  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const run = async () => {
    if (!folders || !active.category) return
    const undo: Change[] = []
    for (const folder of folders.filter((f) => selected.includes(f.id))) {
      const result = await addGroupWithLinks(
        active.category.id,
        { title: folder.title.slice(0, 120), emoji: '🔖' },
        folder.links.slice(0, 500),
      )
      undo.unshift(...result.undo)
    }
    close()
    offerUndo(
      { undo },
      { title: t('bookmarks.imported', { count: selected.length }), undoLabel: t('common.undo') },
    )
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('bookmarks.title')}
      description={t('bookmarks.description', { category: active.category?.name ?? '' })}
      size="md"
      footer={
        access ? (
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" disabled={selected.length === 0} onClick={() => void run()}>
              {t('bookmarks.import', { count: selected.length })}
            </Button>
          </>
        ) : undefined
      }
    >
      {access === false && (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="max-w-[360px] text-[13.5px] text-ink-3">{t('bookmarks.allowHint')}</p>
          <Button
            variant="primary"
            onClick={() =>
              void requestBookmarkAccess().then((granted) => {
                setAccess(granted)
                if (!granted) toast({ title: t('transfer.permissionDenied'), tone: 'info' })
              })
            }
          >
            {t('bookmarks.allow')}
          </Button>
        </div>
      )}
      {access && folders?.length === 0 && (
        <p className="px-4 py-8 text-center text-[13.5px] text-ink-3">{t('bookmarks.empty')}</p>
      )}
      {access && folders && folders.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {folders.map((folder) => {
            const on = selected.includes(folder.id)
            return (
              <li key={folder.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[11px] py-2 pr-3 transition-colors hover:bg-subtle',
                    on && 'bg-accent-soft hover:bg-accent-soft',
                  )}
                  style={{ paddingLeft: 12 + folder.depth * 20 }}
                >
                  <Checkbox
                    checked={on}
                    label={folder.title}
                    onCheckedChange={() => toggle(folder.id)}
                  />
                  <Folder size={16} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                    {folder.title || '—'}
                  </span>
                  <span className="shrink-0 text-[12.5px] text-ink-3">
                    {t('bookmarks.links', { count: folder.links.length })}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
