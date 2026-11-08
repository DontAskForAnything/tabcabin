import { z } from 'zod'
import { type Clock, makeGroup, makeItem } from '../factories'
import { positionsAtEnd } from '../position'
import {
  type Group,
  type Item,
  NOTE_MAX_LENGTH,
  noteColorSchema,
  TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../schema'
import { importableUrl } from './outline'

/** One row of a shared group as the sync server's /shared/<id> gives it (what a copy needs). */
const sharedItemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string().catch(''),
  url: z.string().nullable().catch(null),
  favIconUrl: z.string().nullable().catch(null),
  text: z.string().catch(''),
  color: z.string().nullable().catch(null),
  todo: z.boolean().catch(false),
  done: z.boolean().catch(false),
  parentId: z.string().nullable().catch(null),
})

/** A group someone shared, read from the sync server. */
export const sharedGroupSchema = z.object({
  title: z.string().catch(''),
  emoji: z.string().catch(''),
  items: z.array(sharedItemSchema).max(10_000),
})
export type SharedGroupData = z.infer<typeof sharedGroupSchema>
type SharedItem = SharedGroupData['items'][number]

function itemFrom(
  item: SharedItem,
  place: Pick<Item, 'groupId' | 'parentId' | 'position'>,
  clock: Clock,
): Item | null {
  const color = noteColorSchema.safeParse(item.color).data ?? null
  const text = item.text.slice(0, NOTE_MAX_LENGTH)
  if (item.kind === 'note')
    return makeItem(
      { ...place, kind: 'note', text, color, todo: item.todo, done: item.todo && item.done },
      clock,
    )
  if (item.kind === 'stack')
    return makeItem(
      { ...place, kind: 'stack', title: item.title.slice(0, TITLE_MAX_LENGTH) },
      clock,
    )
  // Links, and pictures as links to where they are.
  const url = item.url ? importableUrl(item.url) : null
  if (!url) return null
  const icon = item.favIconUrl
  return makeItem(
    {
      ...place,
      kind: 'link',
      url,
      title: (item.title || url).slice(0, TITLE_MAX_LENGTH),
      favIconUrl: icon?.startsWith('https://') && icon.length <= URL_MAX_LENGTH ? icon : null,
      text,
      color,
    },
    clock,
  )
}

/**
 * A copy of a shared group for someone's own board: new ids, the same order, links in their stacks
 * and notes pinned to their links. Only addresses a browser can open are kept, and a stack left
 * without links is dropped.
 */
export function copySharedGroup(
  shared: SharedGroupData,
  target: Pick<Group, 'categoryId' | 'position'>,
  clock: Clock,
): { group: Group; items: Item[] } {
  const group = makeGroup(
    {
      ...target,
      title: shared.title.slice(0, TITLE_MAX_LENGTH),
      emoji: shared.emoji.slice(0, 32) || '🔗',
    },
    clock,
  )
  const items: Item[] = []
  const seen = new Set<string>()
  const copyChildren = (parentId: string | null, copyParentId: string | null) => {
    const children = shared.items.filter((item) => item.parentId === parentId && !seen.has(item.id))
    const positions = positionsAtEnd([], children.length)
    children.forEach((child, index) => {
      seen.add(child.id)
      const place = { groupId: group.id, parentId: copyParentId, position: positions[index]! }
      const copy = itemFrom(child, place, clock)
      if (!copy) return
      items.push(copy)
      if (child.kind !== 'note') copyChildren(child.id, copy.id)
    })
  }
  copyChildren(null, null)
  const empty = (stack: Item) => !items.some((item) => item.parentId === stack.id)
  return { group, items: items.filter((item) => item.kind !== 'stack' || !empty(item)) }
}
