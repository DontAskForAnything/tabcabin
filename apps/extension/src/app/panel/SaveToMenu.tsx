import { Plus } from 'lucide-react'
import {
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@tabhangar/ui'
import { sortByPosition } from '@tabhangar/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import type { ActiveContext } from '../useActive'

/** Menu entries listing every group of the active workspace (by category). */
export function SaveToMenuItems({
  active,
  onPick,
  onNewGroup,
}: {
  active: ActiveContext
  onPick: (groupId: string) => void
  onNewGroup: (categoryId: string) => void
}) {
  const t = useT()
  const categories = active.categories ?? []
  const groups = useLiveQuery(
    () =>
      db.groups
        .where('categoryId')
        .anyOf(categories.map((c) => c.id))
        .toArray()
        .then((rows) => sortByPosition(rows.filter((g) => g.deletedAt === null))),
    [categories.map((c) => c.id).join()],
  )
  const current = active.category
  const groupsOf = (categoryId: string) => (groups ?? []).filter((g) => g.categoryId === categoryId)

  return (
    <>
      {current && (
        <>
          <MenuLabel>{current.name}</MenuLabel>
          {groupsOf(current.id).map((group) => (
            <MenuItem
              key={group.id}
              icon={<span className="text-[14px] leading-none">{group.emoji}</span>}
              onSelect={() => onPick(group.id)}
            >
              {group.title || t('group.untitled')}
            </MenuItem>
          ))}
          <MenuItem icon={<Plus size={14} />} onSelect={() => onNewGroup(current.id)}>
            {t('tab.saveToNew')}
          </MenuItem>
        </>
      )}
      {categories.filter((c) => c.id !== current?.id).length > 0 && <MenuSeparator />}
      {categories
        .filter((c) => c.id !== current?.id)
        .map((category) => (
          <MenuSub key={category.id}>
            <MenuSubTrigger>{category.name}</MenuSubTrigger>
            <MenuSubContent>
              {groupsOf(category.id).map((group) => (
                <MenuItem
                  key={group.id}
                  icon={<span className="text-[14px] leading-none">{group.emoji}</span>}
                  onSelect={() => onPick(group.id)}
                >
                  {group.title || t('group.untitled')}
                </MenuItem>
              ))}
              <MenuItem icon={<Plus size={14} />} onSelect={() => onNewGroup(category.id)}>
                {t('tab.saveToNew')}
              </MenuItem>
            </MenuSubContent>
          </MenuSub>
        ))}
    </>
  )
}
