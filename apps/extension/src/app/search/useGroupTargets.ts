import { INBOX_EMOJI, INBOX_ID, sortByPosition } from '@tabcabin/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useT } from '@/i18n'

export interface GroupTarget {
  id: string
  /** "🌍 Quick links" */
  label: string
  /** The category, for groups of the workspace. */
  place: string
}

/** Where search can put things: the Inbox, then every group of the workspace in board order. */
export function useGroupTargets(workspaceId: string | undefined, enabled: boolean) {
  const t = useT()
  const groups = useLiveQuery(async () => {
    if (!enabled || !workspaceId) return []
    const categories = sortByPosition(
      (await db.categories.where('workspaceId').equals(workspaceId).toArray()).filter(
        (category) => category.deletedAt === null,
      ),
    )
    const rows = await db.groups
      .where('categoryId')
      .anyOf(categories.map((category) => category.id))
      .toArray()
    return categories.flatMap((category) =>
      sortByPosition(
        rows.filter((group) => group.categoryId === category.id && group.deletedAt === null),
      ).map((group) => ({
        id: group.id,
        label: `${group.emoji} ${group.title || t('group.untitled')}`,
        place: category.name,
      })),
    )
  }, [enabled, workspaceId, t])
  const inbox: GroupTarget = {
    id: INBOX_ID,
    label: `${INBOX_EMOJI} ${t('inbox.title')}`,
    place: '',
  }
  return [inbox, ...(groups ?? [])]
}
