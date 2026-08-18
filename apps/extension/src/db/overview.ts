import { type Category, sortByPosition, type Workspace } from '@tabhangar/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export interface WorkspaceOverview extends Workspace {
  categories: (Category & { groupCount: number })[]
}

const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

/** Every workspace with its categories and group counts (for pickers and menus). */
export async function loadOverview(): Promise<WorkspaceOverview[]> {
  const [workspaces, categories, groups] = await Promise.all([
    db.workspaces.toArray(),
    db.categories.toArray(),
    db.groups.toArray(),
  ])
  const counts = new Map<string, number>()
  for (const group of live(groups))
    counts.set(group.categoryId, (counts.get(group.categoryId) ?? 0) + 1)
  const liveCategories = live(categories)
  return sortByPosition(live(workspaces)).map((ws) => ({
    ...ws,
    categories: sortByPosition(liveCategories.filter((cat) => cat.workspaceId === ws.id)).map(
      (cat) => ({
        ...cat,
        groupCount: counts.get(cat.id) ?? 0,
      }),
    ),
  }))
}

export function useOverview(): WorkspaceOverview[] | undefined {
  return useLiveQuery(loadOverview, [])
}
