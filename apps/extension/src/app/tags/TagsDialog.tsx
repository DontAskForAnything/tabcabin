import { type Item, type Tag, TAG_LIMITS } from '@tabcabin/core'
import { Button, Modal, toast } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { setItemsTag, tagItemsByName } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { TagPicker } from './TagPicker'
import { useTagList } from './TagsContext'

/** Tags of one item or of several picked ones: what all of them have shows as chosen. */
export function TagsDialog() {
  const t = useT()
  const modal = useUi((s) => s.modal)
  const close = useUi((s) => s.closeModal)
  const ids = modal?.type === 'tags' ? modal.itemIds : null
  const { tags } = useTagList()
  const items = useLiveQuery(
    async () => (ids ? (await db.items.bulkGet(ids)).filter((item): item is Item => !!item) : []),
    [ids?.join()],
  )
  const chosen = tags.filter(
    (tag) => !!items?.length && items.every((item) => item.tagIds?.includes(tag.id)),
  )

  const tellFull = (full: number) => {
    if (full > 0)
      toast({ title: t('tags.itemFull', { count: full, max: TAG_LIMITS.perItem }), tone: 'error' })
  }
  const add = async (name: string) => {
    if (!ids) return
    const result = await tagItemsByName(ids, name)
    if (!result.ok) {
      if (result.error === 'full')
        toast({ title: t('tags.full', { max: TAG_LIMITS.perAccount }), tone: 'error' })
      return
    }
    tellFull(result.full)
  }
  const remove = async (tag: Pick<Tag, 'id'>) => {
    if (!ids) return
    await setItemsTag(ids, tag.id, false)
  }

  return (
    <Modal
      open={!!ids}
      onOpenChange={(open) => !open && close()}
      title={ids && ids.length > 1 ? t('tags.titleMany', { count: ids.length }) : t('tags.title')}
      size="sm"
      footer={
        <Button variant="primary" onClick={close}>
          {t('common.done')}
        </Button>
      }
    >
      {ids && (
        <TagPicker
          tags={tags}
          t={t}
          chosen={chosen}
          onAdd={(name) => void add(name)}
          onRemove={(tag) => void remove(tag)}
          autoFocus
        />
      )}
    </Modal>
  )
}
