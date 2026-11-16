import { hasAnyTag } from '@tabcabin/core'
import type { BoardGroup, BoardItem } from '@/db/hooks'

/** Whether an item (with what is inside it: a stack's links, a link's notes) has a tag. */
const matches = (item: BoardItem, tags: ReadonlySet<string>): boolean =>
  hasAnyTag(item, tags) || item.children.some((child) => matches(child, tags))

/**
 * The groups with only the items that have one of the tags. Groups stay where they are (empty
 * ones too, so the board does not jump); `filtered` says the list is not the whole group.
 */
export function filterByTags<G extends Pick<BoardGroup, 'items'>>(
  groups: readonly G[],
  tags: ReadonlySet<string>,
): (G & { filtered?: true })[] {
  if (tags.size === 0) return [...groups]
  return groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => matches(item, tags)),
    filtered: true as const,
  }))
}
