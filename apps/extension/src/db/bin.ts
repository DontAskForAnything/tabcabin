import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { type BinEntry, listBin } from './repo'

export type BinRow = BinEntry & {
  /** Where the entry lived (workspace, category or group name), if it still exists. */
  place: string | null
}

function parentOf(entry: BinEntry): string | null {
  if (entry.entity === 'category') return entry.row.workspaceId
  if (entry.entity === 'group') return entry.row.categoryId
  if (entry.entity === 'item') return entry.row.groupId
  return null
}

export async function loadBin(): Promise<BinRow[]> {
  const entries = await listBin()
  const ids = (entity: BinEntry['entity']) =>
    entries.flatMap((entry) => (entry.entity === entity ? [parentOf(entry) ?? ''] : []))
  const [workspaces, categories, groups] = await Promise.all([
    db.workspaces.bulkGet(ids('category')),
    db.categories.bulkGet(ids('group')),
    db.groups.bulkGet(ids('item')),
  ])
  const names = new Map<string, string>()
  for (const ws of workspaces) if (ws) names.set(ws.id, `${ws.emoji} ${ws.name}`.trim())
  for (const cat of categories) if (cat) names.set(cat.id, cat.name)
  for (const group of groups) if (group) names.set(group.id, `${group.emoji} ${group.title}`.trim())
  return entries.map((entry) => {
    const parent = parentOf(entry)
    return { ...entry, place: parent ? (names.get(parent) ?? null) : null }
  })
}

export function useBin(enabled: boolean): BinRow[] | undefined {
  return useLiveQuery(() => (enabled ? loadBin() : Promise.resolve([])), [enabled])
}
