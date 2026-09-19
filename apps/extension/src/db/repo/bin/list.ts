import { type Category, type Group, type Item, type Workspace } from '@tabhangar/core'
import { db } from '../../db'

export type BinEntry =
  | { entity: 'workspace'; row: Workspace }
  | { entity: 'category'; row: Category }
  | { entity: 'group'; row: Group; itemCount: number }
  | { entity: 'item'; row: Item }

const deletedRows = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt !== null)

/** Top-level deleted things, newest first (children deleted together with a parent are hidden). */
export async function listBin(): Promise<BinEntry[]> {
  const [workspaces, categories, groups, items] = await Promise.all([
    db.workspaces.toArray(),
    db.categories.toArray(),
    db.groups.toArray(),
    db.items.toArray(),
  ])
  const byId = <T extends { id: string }>(rows: readonly T[]) =>
    new Map(rows.map((row) => [row.id, row]))
  const wsMap = byId(workspaces)
  const catMap = byId(categories)
  const groupMap = byId(groups)
  const itemMap = byId(items)
  const sameDeletion = (
    child: { deletedAt: number | null },
    parent?: { deletedAt: number | null },
  ) => parent !== undefined && parent.deletedAt !== null && parent.deletedAt === child.deletedAt

  const entries: BinEntry[] = []
  for (const row of deletedRows(workspaces)) entries.push({ entity: 'workspace', row })
  for (const row of deletedRows(categories))
    if (!sameDeletion(row, wsMap.get(row.workspaceId))) entries.push({ entity: 'category', row })
  for (const row of deletedRows(groups))
    if (!sameDeletion(row, catMap.get(row.categoryId)))
      entries.push({
        entity: 'group',
        row,
        itemCount: items.filter(
          (i) => i.groupId === row.id && i.deletedAt === row.deletedAt && i.parentId === null,
        ).length,
      })
  for (const row of deletedRows(items)) {
    const parent = row.parentId ? itemMap.get(row.parentId) : undefined
    if (sameDeletion(row, groupMap.get(row.groupId)) || sameDeletion(row, parent)) continue
    entries.push({ entity: 'item', row })
  }
  return entries.sort((a, b) => (b.row.deletedAt ?? 0) - (a.row.deletedAt ?? 0))
}
