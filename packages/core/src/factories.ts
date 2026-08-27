import { newId } from './ids'
import { minutesOfDay } from './reminders'
import {
  type Category,
  type Group,
  type Item,
  type Reminder,
  URL_MAX_LENGTH,
  type Workspace,
} from './schema'

export interface Clock {
  now: number
}

const stamps = (now: number) => ({ createdAt: now, updatedAt: now, deletedAt: null })

export function makeWorkspace(
  input: Pick<Workspace, 'name' | 'position'> & Partial<Pick<Workspace, 'emoji' | 'id'>>,
  { now }: Clock,
): Workspace {
  return {
    id: input.id ?? newId(),
    emoji: input.emoji ?? '📦',
    name: input.name,
    position: input.position,
    ...stamps(now),
  }
}

export function makeCategory(
  input: Pick<Category, 'workspaceId' | 'name' | 'position'> & Partial<Pick<Category, 'id'>>,
  { now }: Clock,
): Category {
  return {
    id: input.id ?? newId(),
    workspaceId: input.workspaceId,
    name: input.name,
    position: input.position,
    ...stamps(now),
  }
}

export function makeGroup(
  input: Pick<Group, 'categoryId' | 'position'> &
    Partial<Pick<Group, 'id' | 'title' | 'emoji' | 'collapsed' | 'width'>>,
  { now }: Clock,
): Group {
  return {
    id: input.id ?? newId(),
    categoryId: input.categoryId,
    title: input.title ?? '',
    emoji: input.emoji ?? '📁',
    position: input.position,
    collapsed: input.collapsed ?? false,
    width: input.width ?? null,
    ...stamps(now),
  }
}

type ItemInput = Pick<Item, 'groupId' | 'position' | 'kind'> &
  Partial<Omit<Item, 'groupId' | 'position' | 'kind'>>

export function makeItem(input: ItemInput, { now }: Clock): Item {
  return {
    id: input.id ?? newId(),
    groupId: input.groupId,
    parentId: input.parentId ?? null,
    kind: input.kind,
    position: input.position,
    title: input.title ?? '',
    url: input.url ?? null,
    favIconUrl: input.favIconUrl ?? null,
    text: input.text ?? '',
    color: input.color ?? null,
    todo: input.todo ?? false,
    done: input.done ?? false,
    imageUrl: input.imageUrl ?? null,
    metaImageUrl: input.metaImageUrl ?? null,
    emoji: input.emoji ?? null,
    sourceUrl: input.sourceUrl ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  }
}

export function makeLink(
  input: Pick<Item, 'groupId' | 'position'> & {
    url: string
    title?: string
    favIconUrl?: string | null
    text?: string
  },
  clock: Clock,
): Item {
  return makeItem(
    {
      kind: 'link',
      groupId: input.groupId,
      position: input.position,
      url: input.url,
      title: input.title ?? input.url,
      // Some pages use huge data: URIs as icons; those are not worth storing.
      favIconUrl:
        input.favIconUrl && input.favIconUrl.length <= URL_MAX_LENGTH ? input.favIconUrl : null,
      text: input.text ?? '',
    },
    clock,
  )
}

export function makeNote(
  input: Pick<Item, 'groupId' | 'position'> &
    Partial<Pick<Item, 'text' | 'todo' | 'done' | 'color' | 'sourceUrl' | 'title'>>,
  clock: Clock,
): Item {
  return makeItem({ kind: 'note', ...input }, clock)
}

export function makeReminder(
  input: Pick<Reminder, 'itemId' | 'dueAt'> &
    Partial<Pick<Reminder, 'repeat' | 'weekdays' | 'monthDay' | 'timeOfDay'>>,
  { now }: Clock,
): Reminder {
  return {
    id: newId(),
    itemId: input.itemId,
    dueAt: input.dueAt,
    repeat: input.repeat ?? 'none',
    weekdays: input.weekdays ?? [],
    monthDay: input.monthDay ?? null,
    timeOfDay: input.timeOfDay ?? minutesOfDay(input.dueAt),
    firedAt: null,
    ...stamps(now),
  }
}

/** Returns a copy marked as changed now. */
export function touch<T extends { updatedAt: number }>(
  row: T,
  patch: NoInfer<Partial<T>>,
  { now }: Clock,
): T {
  return { ...row, ...patch, updatedAt: now }
}
