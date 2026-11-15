import { TAG_LIMITS } from '@tabcabin/core'
import {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  toast,
} from '@tabcabin/ui'
import { Plus, Tag as TagIcon } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { setItemsTag } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { TagChip } from './TagChip'
import { useTagList } from './TagsContext'

/**
 * "Tags" in an item's right-click menu: tick a tag to put it on the item (or on every picked
 * item), "New tag…" opens the tags window.
 */
export function TagsSubmenu({ ids }: { ids: () => string[] }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const { tags } = useTagList()
  const chosen = ids()
  const items = useLiveQuery(() => db.items.bulkGet(chosen), [chosen.join()])
  const on = (tagId: string) =>
    !!items?.length && items.every((item) => item?.tagIds?.includes(tagId))

  const toggle = async (tagId: string, checked: boolean) => {
    const result = await setItemsTag(chosen, tagId, checked)
    if (result.full > 0)
      toast({
        title: t('tags.itemFull', { count: result.full, max: TAG_LIMITS.perItem }),
        tone: 'error',
      })
  }

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger icon={<TagIcon size={14} />}>{t('tags.menu')}</ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-[360px] overflow-y-auto">
        {tags.map((tag) => (
          <ContextMenuCheckboxItem
            key={tag.id}
            checked={on(tag.id)}
            // The menu stays open, so several tags can be ticked in a row.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => void toggle(tag.id, checked)}
          >
            <TagChip tag={tag} className="h-5 text-[12px]" />
          </ContextMenuCheckboxItem>
        ))}
        {tags.length > 0 && <ContextMenuSeparator />}
        <ContextMenuItem
          icon={<Plus size={14} />}
          onSelect={() => openModal({ type: 'tags', itemIds: chosen })}
        >
          {t('tags.new')}
        </ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
