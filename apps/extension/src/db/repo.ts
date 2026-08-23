import {
  type Category,
  type Change,
  combineItems,
  dueAfterDone,
  type CombineError,
  duplicateGroup as duplicateGroupOp,
  type EntityMap,
  type EntityType,
  type Group,
  type Item,
  makeCategory,
  makeGroup,
  makeItem,
  makeLink,
  makeNote,
  makeReminder,
  makeWorkspace,
  moveItems,
  positionAtEnd,
  positionAtIndex,
  positionBetween,
  purge,
  put,
  puts,
  type Reminder,
  sortByPosition,
  sortItems,
  type SortMode,
  touch,
  unstack,
  type Workspace,
} from '@tabhangar/core'
import { applyChanges, loadRow } from './apply'
import { db, tables } from './db'

export interface Result {
  /** Change set that reverts the operation. */
  undo: Change[]
}

const clock = () => ({ now: Date.now() })
const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

/** Applies `next` and returns the inverse built from the rows as they were before. */
async function commit(next: Change[]): Promise<Result> {
  const undo: Change[] = []
  for (const change of next) {
    const id = change.type === 'put' ? change.row.id : change.id
    const previous = await loadRow(change.entity, id)
    undo.unshift(
      previous
        ? put(change.entity, previous as EntityMap[typeof change.entity])
        : purge(change.entity, id),
    )
  }
  await applyChanges(next)
  return { undo }
}

export async function revert(result: Result) {
  await applyChanges(result.undo, { bump: true })
}

// ---------- reads ----------

export async function getWorkspaces(): Promise<Workspace[]> {
  return sortByPosition(live(await db.workspaces.toArray()))
}

export async function getCategories(workspaceId: string): Promise<Category[]> {
  return sortByPosition(
    live(await db.categories.where('workspaceId').equals(workspaceId).toArray()),
  )
}

export async function getGroups(categoryId: string): Promise<Group[]> {
  return sortByPosition(live(await db.groups.where('categoryId').equals(categoryId).toArray()))
}

/** Live items of a group (top level and stack children). */
export async function getGroupItems(groupId: string): Promise<Item[]> {
  return live(await db.items.where('groupId').equals(groupId).toArray())
}

async function getTopLevelItems(groupId: string): Promise<Item[]> {
  return sortByPosition((await getGroupItems(groupId)).filter((item) => item.parentId === null))
}

async function mustGet<E extends EntityType>(entity: E, id: string): Promise<EntityMap[E]> {
  const row = await loadRow(entity, id)
  if (!row) throw new Error(`${entity} ${id} not found`)
  return row
}

// ---------- workspaces ----------

export async function createWorkspace(input: {
  name: string
  emoji?: string
  categoryName: string
}): Promise<Result & { workspaceId: string; categoryId: string }> {
  const c = clock()
  const workspace = makeWorkspace(
    { name: input.name, emoji: input.emoji, position: positionAtEnd(await getWorkspaces()) },
    c,
  )
  const category = makeCategory(
    { workspaceId: workspace.id, name: input.categoryName, position: positionBetween(null, null) },
    c,
  )
  const result = await commit([put('workspace', workspace), put('category', category)])
  return { ...result, workspaceId: workspace.id, categoryId: category.id }
}

export async function updateWorkspace(
  id: string,
  patch: Partial<Pick<Workspace, 'name' | 'emoji'>>,
) {
  const row = await mustGet('workspace', id)
  return commit([put('workspace', touch(row, patch, clock()))])
}

export async function reorderWorkspace(id: string, index: number) {
  const others = (await getWorkspaces()).filter((ws) => ws.id !== id)
  const row = await mustGet('workspace', id)
  return commit([
    put('workspace', touch(row, { position: positionAtIndex(others, index) }, clock())),
  ])
}

async function descendantsOfCategories(categoryIds: string[]) {
  const groups = live(await db.groups.where('categoryId').anyOf(categoryIds).toArray())
  const items = live(
    await db.items
      .where('groupId')
      .anyOf(groups.map((g) => g.id))
      .toArray(),
  )
  return { groups, items }
}

export async function deleteWorkspace(id: string) {
  const c = clock()
  const workspace = await mustGet('workspace', id)
  const categories = await getCategories(id)
  const { groups, items } = await descendantsOfCategories(categories.map((cat) => cat.id))
  const deleted = { deletedAt: c.now }
  return commit([
    put('workspace', touch(workspace, deleted, c)),
    ...puts(
      'category',
      categories.map((row) => touch(row, deleted, c)),
    ),
    ...puts(
      'group',
      groups.map((row) => touch(row, deleted, c)),
    ),
    ...puts(
      'item',
      items.map((row) => touch(row, deleted, c)),
    ),
  ])
}

// ---------- categories ----------

export async function createCategory(
  workspaceId: string,
  name: string,
  index?: number,
): Promise<Result & { categoryId: string }> {
  const siblings = await getCategories(workspaceId)
  const position = index === undefined ? positionAtEnd(siblings) : positionAtIndex(siblings, index)
  const category = makeCategory({ workspaceId, name, position }, clock())
  return { ...(await commit([put('category', category)])), categoryId: category.id }
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name'>>) {
  const row = await mustGet('category', id)
  return commit([put('category', touch(row, patch, clock()))])
}

/** Moves a category inside its workspace or into another one. */
export async function moveCategory(id: string, target: { workspaceId: string; index?: number }) {
  const row = await mustGet('category', id)
  const siblings = (await getCategories(target.workspaceId)).filter((cat) => cat.id !== id)
  const position =
    target.index === undefined ? positionAtEnd(siblings) : positionAtIndex(siblings, target.index)
  return commit([
    put('category', touch(row, { workspaceId: target.workspaceId, position }, clock())),
  ])
}

export async function deleteCategory(id: string) {
  const c = clock()
  const category = await mustGet('category', id)
  const { groups, items } = await descendantsOfCategories([id])
  const deleted = { deletedAt: c.now }
  return commit([
    put('category', touch(category, deleted, c)),
    ...puts(
      'group',
      groups.map((row) => touch(row, deleted, c)),
    ),
    ...puts(
      'item',
      items.map((row) => touch(row, deleted, c)),
    ),
  ])
}

// ---------- groups ----------

export async function createGroup(
  categoryId: string,
  input: { title?: string; emoji?: string; index?: number } = {},
): Promise<Result & { groupId: string }> {
  const siblings = await getGroups(categoryId)
  const position =
    input.index === undefined ? positionAtEnd(siblings) : positionAtIndex(siblings, input.index)
  const group = makeGroup({ categoryId, position, title: input.title, emoji: input.emoji }, clock())
  return { ...(await commit([put('group', group)])), groupId: group.id }
}

export async function updateGroup(
  id: string,
  patch: Partial<Pick<Group, 'title' | 'emoji' | 'collapsed' | 'width'>>,
) {
  const row = await mustGet('group', id)
  return commit([put('group', touch(row, patch, clock()))])
}

export async function moveGroup(id: string, target: { categoryId: string; index: number }) {
  const row = await mustGet('group', id)
  const siblings = (await getGroups(target.categoryId)).filter((group) => group.id !== id)
  return commit([
    put(
      'group',
      touch(
        row,
        { categoryId: target.categoryId, position: positionAtIndex(siblings, target.index) },
        clock(),
      ),
    ),
  ])
}

export async function deleteGroup(id: string) {
  const c = clock()
  const group = await mustGet('group', id)
  const items = await getGroupItems(id)
  const deleted = { deletedAt: c.now }
  return commit([
    put('group', touch(group, deleted, c)),
    ...puts(
      'item',
      items.map((row) => touch(row, deleted, c)),
    ),
  ])
}

export async function duplicateGroup(id: string, titleSuffix: string) {
  const group = await mustGet('group', id)
  const siblings = await getGroups(group.categoryId)
  const index = siblings.findIndex((g) => g.id === id)
  const copy = duplicateGroupOp(
    group,
    await getGroupItems(id),
    positionAtIndex(siblings, index + 1),
    clock(),
    titleSuffix,
  )
  const result = await commit([put('group', copy.group), ...puts('item', copy.items)])
  return { ...result, groupId: copy.group.id }
}

export async function sortGroup(id: string, mode: SortMode, locale: string) {
  return commit(puts('item', sortItems(await getGroupItems(id), mode, clock(), locale)))
}

// ---------- items ----------

export interface NewLink {
  url: string
  title?: string
  favIconUrl?: string | null
}

export async function addLinks(
  groupId: string,
  links: readonly NewLink[],
  index?: number,
): Promise<Result & { ids: string[] }> {
  const c = clock()
  const created = links.map((link) =>
    makeLink(
      { groupId, position: 'a0', url: link.url, title: link.title, favIconUrl: link.favIconUrl },
      c,
    ),
  )
  const siblings = await getTopLevelItems(groupId)
  const placed = moveItems(
    { moving: created, toGroupId: groupId, siblings, index: index ?? siblings.length },
    c,
  )
  const result = await commit(puts('item', placed))
  return { ...result, ids: placed.map((item) => item.id) }
}

export async function addNote(
  groupId: string,
  input: Partial<Pick<Item, 'text' | 'todo' | 'done' | 'color' | 'sourceUrl' | 'title'>> = {},
  placement: { index?: number; afterId?: string } = {},
): Promise<Result & { id: string }> {
  const c = clock()
  const siblings = await getTopLevelItems(groupId)
  let index = placement.index ?? siblings.length
  if (placement.afterId) {
    const at = siblings.findIndex((item) => item.id === placement.afterId)
    if (at >= 0) index = at + 1
  }
  const note = makeNote({ groupId, position: positionAtIndex(siblings, index), ...input }, c)
  return { ...(await commit([put('item', note)])), id: note.id }
}

export async function addImage(
  groupId: string,
  input: { imageUrl: string; title?: string; url?: string | null },
  index?: number,
): Promise<Result & { id: string }> {
  const siblings = await getTopLevelItems(groupId)
  const image = makeItem(
    {
      kind: 'image',
      groupId,
      position: positionAtIndex(siblings, index ?? siblings.length),
      imageUrl: input.imageUrl,
      title: input.title ?? '',
      url: input.url ?? null,
    },
    clock(),
  )
  return { ...(await commit([put('item', image)])), id: image.id }
}

export type ItemPatch = Partial<
  Pick<
    Item,
    | 'title'
    | 'url'
    | 'text'
    | 'color'
    | 'todo'
    | 'done'
    | 'emoji'
    | 'metaImageUrl'
    | 'favIconUrl'
    | 'imageUrl'
  >
>

export async function updateItem(id: string, patch: ItemPatch) {
  const row = await mustGet('item', id)
  return commit([put('item', touch(row, patch, clock()))])
}

/** Turns a note into a link or image (keeps its place in the group). */
export async function convertNote(id: string, kind: 'link' | 'image', url: string, title: string) {
  const row = await mustGet('item', id)
  const patch =
    kind === 'link'
      ? { kind, url, title, text: '', todo: false, done: false }
      : { kind, imageUrl: url, url: null, title, text: '', todo: false, done: false }
  return commit([put('item', touch(row, patch, clock()))])
}

async function childrenOf(stackIds: readonly string[]): Promise<Item[]> {
  if (stackIds.length === 0) return []
  return live(
    await db.items
      .where('parentId')
      .anyOf([...stackIds])
      .toArray(),
  )
}

/** Moves items (in the given order) into a group or a stack at `index`. */
export async function moveItemsTo(
  ids: readonly string[],
  target: { groupId: string; index: number; parentId?: string | null },
) {
  const moving = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const parentId = target.parentId ?? null
  const siblings = live(await db.items.where('groupId').equals(target.groupId).toArray()).filter(
    (item) => item.parentId === parentId,
  )
  const stacks = moving.filter((item) => item.kind === 'stack').map((item) => item.id)
  const rows = moveItems(
    {
      moving,
      children: await childrenOf(stacks),
      toGroupId: target.groupId,
      toParentId: parentId,
      siblings,
      index: target.index,
    },
    clock(),
  )
  return commit(puts('item', rows))
}

export async function combine(
  ids: readonly string[],
  targetId: string,
): Promise<(Result & { ok: true }) | { ok: false; error: CombineError }> {
  const dragged = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const target = await mustGet('item', targetId)
  const outcome = combineItems(
    dragged,
    target,
    {
      targetChildren: target.kind === 'stack' ? await childrenOf([target.id]) : [],
      draggedChildren: await childrenOf(dragged.filter((d) => d.kind === 'stack').map((d) => d.id)),
    },
    clock(),
  )
  if (!outcome.ok) return outcome
  return { ok: true, ...(await commit(puts('item', outcome.rows))) }
}

export async function unstackById(stackId: string) {
  const stack = await mustGet('item', stackId)
  const rows = unstack(
    stack,
    await childrenOf([stackId]),
    await getGroupItems(stack.groupId),
    clock(),
  )
  return commit(puts('item', rows))
}

export async function deleteItems(ids: readonly string[]) {
  const c = clock()
  const rows = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const children = await childrenOf(rows.filter((row) => row.kind === 'stack').map((row) => row.id))
  return commit(
    puts(
      'item',
      [...rows, ...children].map((row) => touch(row, { deletedAt: c.now }, c)),
    ),
  )
}

// ---------- bin ----------

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

export interface RestoreTarget {
  workspaceId: string
  categoryId: string
  restoredGroupTitle: string
}

/** Restores a bin entry with everything deleted together with it. */
export async function restoreFromBin(entity: EntityType, id: string, target: RestoreTarget) {
  const c = clock()
  const restoreRow = <T extends { updatedAt: number; deletedAt: number | null }>(
    row: T,
    patch: Partial<T> = {},
  ) => touch(row, { ...patch, deletedAt: null } as Partial<T>, c)
  const changes: Change[] = []

  const restoreGroupTree = async (
    group: Group,
    deletedAt: number | null,
    patch: Partial<Group> = {},
  ) => {
    changes.push(put('group', restoreRow(group, patch)))
    const items = await db.items.where('groupId').equals(group.id).toArray()
    for (const item of items)
      if (item.deletedAt === deletedAt) changes.push(put('item', restoreRow(item)))
  }
  const restoreCategoryTree = async (
    category: Category,
    deletedAt: number | null,
    patch: Partial<Category> = {},
  ) => {
    changes.push(put('category', restoreRow(category, patch)))
    const groups = await db.groups.where('categoryId').equals(category.id).toArray()
    for (const group of groups)
      if (group.deletedAt === deletedAt) await restoreGroupTree(group, deletedAt)
  }

  if (entity === 'workspace') {
    const ws = await mustGet('workspace', id)
    changes.push(put('workspace', restoreRow(ws)))
    const categories = await db.categories.where('workspaceId').equals(id).toArray()
    for (const category of categories)
      if (category.deletedAt === ws.deletedAt) await restoreCategoryTree(category, ws.deletedAt)
  } else if (entity === 'category') {
    const category = await mustGet('category', id)
    const parent = await loadRow('workspace', category.workspaceId)
    const orphan = !parent || parent.deletedAt !== null
    await restoreCategoryTree(
      category,
      category.deletedAt,
      orphan
        ? {
            workspaceId: target.workspaceId,
            position: positionAtEnd(await getCategories(target.workspaceId)),
          }
        : {},
    )
  } else if (entity === 'group') {
    const group = await mustGet('group', id)
    const parent = await loadRow('category', group.categoryId)
    const orphan = !parent || parent.deletedAt !== null
    await restoreGroupTree(
      group,
      group.deletedAt,
      orphan
        ? {
            categoryId: target.categoryId,
            position: positionAtEnd(await getGroups(target.categoryId)),
          }
        : {},
    )
  } else if (entity === 'item') {
    const item = await mustGet('item', id)
    const group = await loadRow('group', item.groupId)
    const stack = item.parentId ? await loadRow('item', item.parentId) : undefined
    let groupId = item.groupId
    if (!group || group.deletedAt !== null) {
      const groups = await getGroups(target.categoryId)
      let restored = groups.find((g) => g.title === target.restoredGroupTitle)
      if (!restored) {
        restored = makeGroup(
          {
            categoryId: target.categoryId,
            position: positionAtEnd(groups),
            title: target.restoredGroupTitle,
            emoji: '♻️',
          },
          c,
        )
        changes.push(put('group', restored))
      }
      groupId = restored.id
    }
    const detached = groupId !== item.groupId || (stack !== undefined && stack.deletedAt !== null)
    const siblings = await getTopLevelItems(groupId)
    changes.push(
      put(
        'item',
        restoreRow(
          item,
          detached ? { groupId, parentId: null, position: positionAtEnd(siblings) } : {},
        ),
      ),
    )
    if (item.kind === 'stack') {
      for (const child of await db.items.where('parentId').equals(item.id).toArray())
        if (child.deletedAt === item.deletedAt)
          changes.push(put('item', restoreRow(child, detached ? { groupId } : {})))
    }
  }
  return commit(changes)
}

/** Adds purges of the reminders attached to purged items. */
async function withReminderPurges(changes: Change[]): Promise<Change[]> {
  const itemIds = changes.flatMap((c) => (c.type === 'purge' && c.entity === 'item' ? [c.id] : []))
  if (itemIds.length === 0) return changes
  const reminders = await db.reminders.where('itemId').anyOf(itemIds).toArray()
  return [...changes, ...reminders.map((r) => purge('reminder', r.id))]
}

/** Permanently removes a bin entry and everything deleted together with it. */
export async function purgeFromBin(entity: EntityType, id: string) {
  const changes: Change[] = [purge(entity, id)]
  const row = await loadRow(entity, id)
  if (!row) return { undo: [] }
  const ts = row.deletedAt
  if (entity === 'workspace' || entity === 'category' || entity === 'group') {
    const categoryIds =
      entity === 'workspace'
        ? (await db.categories.where('workspaceId').equals(id).toArray())
            .filter((c) => c.deletedAt === ts)
            .map((c) => c.id)
        : entity === 'category'
          ? [id]
          : []
    for (const cid of categoryIds) if (cid !== id) changes.push(purge('category', cid))
    const groupIds =
      entity === 'group'
        ? [id]
        : (await db.groups.where('categoryId').anyOf(categoryIds).toArray())
            .filter((g) => g.deletedAt === ts)
            .map((g) => g.id)
    for (const gid of groupIds) if (gid !== id) changes.push(purge('group', gid))
    const items = (await db.items.where('groupId').anyOf(groupIds).toArray()).filter(
      (i) => i.deletedAt === ts,
    )
    for (const item of items) changes.push(purge('item', item.id))
  } else if (entity === 'item') {
    const children = (await db.items.where('parentId').equals(id).toArray()).filter(
      (i) => i.deletedAt === ts,
    )
    for (const child of children) changes.push(purge('item', child.id))
  }
  return commit(await withReminderPurges(changes))
}

export const BIN_LIMIT = 100

/** Permanently removes bin entries beyond the newest `keep`. */
export async function trimBin(keep = BIN_LIMIT) {
  const entries = await listBin()
  for (const entry of entries.slice(keep)) await purgeFromBin(entry.entity, entry.row.id)
  return Math.max(0, entries.length - keep)
}

export async function emptyBin() {
  const entries = await listBin()
  const undo: Change[] = []
  for (const entry of entries) undo.push(...(await purgeFromBin(entry.entity, entry.row.id)).undo)
  return { undo }
}

// ---------- reminders ----------

export type ReminderInput = Pick<
  Reminder,
  'dueAt' | 'repeat' | 'weekdays' | 'monthDay' | 'timeOfDay'
>

/** The live reminder of an item (an item has at most one). */
export async function getItemReminder(itemId: string): Promise<Reminder | undefined> {
  return live(await db.reminders.where('itemId').equals(itemId).toArray())[0]
}

/** Creates or replaces the reminder of an item. */
export async function setReminder(itemId: string, input: ReminderInput) {
  const c = clock()
  const [current, ...extra] = live(await db.reminders.where('itemId').equals(itemId).toArray())
  const changes: Change[] = extra.map((row) => put('reminder', touch(row, { deletedAt: c.now }, c)))
  changes.push(
    put(
      'reminder',
      current
        ? touch(current, { ...input, firedAt: null }, c)
        : makeReminder({ itemId, ...input }, c),
    ),
  )
  return commit(changes)
}

export async function removeReminder(id: string) {
  const c = clock()
  return commit([put('reminder', touch(await mustGet('reminder', id), { deletedAt: c.now }, c))])
}

/** Marks a reminder done: one-time reminders are removed, repeating ones move to the next date. */
export async function completeReminder(id: string) {
  const c = clock()
  const row = await mustGet('reminder', id)
  const next = dueAfterDone(row, c.now)
  return commit([
    put(
      'reminder',
      touch(row, next === null ? { deletedAt: c.now } : { dueAt: next, firedAt: null }, c),
    ),
  ])
}

export async function snoozeReminder(id: string, until: number) {
  const row = await mustGet('reminder', id)
  return commit([put('reminder', touch(row, { dueAt: until, firedAt: null }, clock()))])
}

export async function markRemindersFired(ids: readonly string[]) {
  const c = clock()
  const rows = await db.reminders.bulkGet([...ids])
  await applyChanges(
    rows.flatMap((row) => (row ? [put('reminder', touch(row, { firedAt: c.now }, c))] : [])),
  )
}

export { tables }
