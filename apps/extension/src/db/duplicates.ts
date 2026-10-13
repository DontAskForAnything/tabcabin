import { INBOX_ID, normalizeUrl } from '@tabcabin/core'
import { db } from './db'

/** Where a link is already saved: enough to name the place and to show the item there. */
export interface SavedPlace {
  url: string
  itemId: string
  groupId: string
  /** The group, for example "🌍 Quick links". */
  label: string
  categoryId?: string
  workspaceId?: string
}

/**
 * Links with these addresses that are already saved in another group (one place per address).
 * Addresses are compared the way the badge counts saved pages (`normalizeUrl`).
 */
export async function savedElsewhere(urls: readonly string[], groupId: string) {
  const wanted = new Map<string, string>()
  for (const url of urls) {
    const key = normalizeUrl(url)
    if (key && !wanted.has(key)) wanted.set(key, url)
  }
  if (wanted.size === 0) return []
  const [items, groups, categories] = await Promise.all([
    db.items.toArray(),
    db.groups.toArray(),
    db.categories.toArray(),
  ])
  const liveGroups = new Map(groups.filter((g) => g.deletedAt === null).map((g) => [g.id, g]))
  const liveCategories = new Map(
    categories.filter((c) => c.deletedAt === null).map((c) => [c.id, c]),
  )
  const places: SavedPlace[] = []
  for (const item of items) {
    if (item.deletedAt !== null || !item.url || item.groupId === groupId) continue
    const key = normalizeUrl(item.url)
    const url = key && wanted.get(key)
    const group = liveGroups.get(item.groupId)
    if (!url || !group) continue
    const category = liveCategories.get(group.categoryId)
    if (group.id !== INBOX_ID && !category) continue
    wanted.delete(key)
    places.push({
      url,
      itemId: item.parentId ?? item.id,
      groupId: group.id,
      label: `${group.emoji} ${group.title}`.trim(),
      categoryId: category?.id,
      workspaceId: category?.workspaceId,
    })
  }
  return places
}
