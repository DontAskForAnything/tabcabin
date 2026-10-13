import { INBOX_ID, type Item } from '@tabcabin/core'
import { db } from './db'

type SearchKind = 'link' | 'note' | 'todo' | 'image' | 'tab' | 'bookmark' | 'group' | 'command'

export interface SearchDoc {
  key: string
  kind: SearchKind
  title: string
  url: string | null
  text: string
  done?: boolean
  createdAt: number
  /** Board location (items and groups). `itemId` is what to show: a link in a stack shows the stack. */
  itemId?: string
  /** The item itself, to move it. */
  rowId?: string
  /** Groups only. */
  emoji?: string
  groupId?: string
  categoryId?: string
  workspaceId?: string
  path: string
  /** Open tabs only. */
  tabId?: number
  windowId?: number
  favIconUrl?: string | null
}

const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

function kindOf(item: Item): SearchKind {
  if (item.kind === 'note') return item.todo ? 'todo' : 'note'
  if (item.kind === 'image') return 'image'
  return 'link'
}

/** Every saved item (stacks flattened to their links), optionally limited to one workspace. */
export async function loadItemDocs(workspaceId?: string): Promise<SearchDoc[]> {
  const [workspaces, categories, groups, items] = await Promise.all([
    db.workspaces.toArray(),
    db.categories.toArray(),
    db.groups.toArray(),
    db.items.toArray(),
  ])
  const wsMap = new Map(live(workspaces).map((ws) => [ws.id, ws]))
  const catMap = new Map(
    live(categories)
      .filter((c) => wsMap.has(c.workspaceId))
      .map((c) => [c.id, c]),
  )
  const groupMap = new Map(
    live(groups)
      .filter((g) => catMap.has(g.categoryId) || g.id === INBOX_ID)
      .map((g) => [g.id, g]),
  )
  const docs: SearchDoc[] = []
  for (const item of live(items)) {
    if (item.kind === 'stack') continue
    const group = groupMap.get(item.groupId)
    if (!group) continue
    const groupName = `${group.emoji} ${group.title}`.trim()
    // The Inbox shows on every board, so its items belong to every workspace.
    if (group.id === INBOX_ID) {
      docs.push({ ...itemDoc(item), groupId: group.id, path: groupName })
      continue
    }
    const category = catMap.get(group.categoryId)!
    const workspace = wsMap.get(category.workspaceId)!
    if (workspaceId && workspace.id !== workspaceId) continue
    const path = [workspace.name, category.name, groupName]
    docs.push({
      ...itemDoc(item),
      groupId: group.id,
      categoryId: category.id,
      workspaceId: workspace.id,
      path: (workspaceId ? path.slice(1) : path).join(' › '),
    })
  }
  return docs
}

function itemDoc(item: Item) {
  return {
    key: `item:${item.id}`,
    kind: kindOf(item),
    title: item.kind === 'note' ? item.text.split('\n')[0]!.slice(0, 160) : item.title,
    url: item.url ?? item.imageUrl,
    text: item.text,
    done: item.done,
    createdAt: item.createdAt,
    itemId: item.parentId ?? item.id,
    rowId: item.id,
    favIconUrl: item.favIconUrl,
  }
}

/** Named groups (to open them from search), optionally limited to one workspace. */
export async function loadGroupDocs(workspaceId?: string): Promise<SearchDoc[]> {
  const [workspaces, categories, groups] = await Promise.all([
    db.workspaces.toArray(),
    db.categories.toArray(),
    db.groups.toArray(),
  ])
  const wsMap = new Map(live(workspaces).map((ws) => [ws.id, ws]))
  const catMap = new Map(
    live(categories)
      .filter((c) => wsMap.has(c.workspaceId))
      .map((c) => [c.id, c]),
  )
  const docs: SearchDoc[] = []
  for (const group of live(groups)) {
    const category = catMap.get(group.categoryId)
    if (!category || !group.title) continue
    const workspace = wsMap.get(category.workspaceId)!
    if (workspaceId && workspace.id !== workspaceId) continue
    docs.push({
      key: `group:${group.id}`,
      kind: 'group',
      title: group.title,
      url: null,
      text: '',
      createdAt: group.createdAt,
      groupId: group.id,
      categoryId: category.id,
      workspaceId: workspace.id,
      path: workspaceId ? category.name : `${workspace.name} › ${category.name}`,
      emoji: group.emoji,
    })
  }
  return docs
}
