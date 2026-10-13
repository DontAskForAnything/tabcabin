import type { SearchDoc } from '@/db/search'
import type { MessageKey } from '@/i18n'
import type { SearchHit } from './engine'
import type { Scope } from './scopes'

const SECTION: Record<SearchDoc['kind'], MessageKey> = {
  link: 'search.sectionLinks',
  image: 'search.sectionLinks',
  note: 'search.sectionNotes',
  todo: 'search.sectionNotes',
  tab: 'search.sectionTabs',
  bookmark: 'search.sectionBookmarks',
  group: 'search.sectionGroups',
  command: 'search.sectionActions',
}

export interface HitSection {
  key: MessageKey
  hits: SearchHit[]
}

/** Results under headings: by kind while searching, otherwise "Recently added" (or open tabs). */
export function groupHits(hits: SearchHit[], searching: boolean, scope: Scope): HitSection[] {
  const order: MessageKey[] = []
  const byKey = new Map<MessageKey, SearchHit[]>()
  for (const hit of hits) {
    const key = searching
      ? SECTION[hit.doc.kind]
      : scope === 'tabs'
        ? 'search.sectionTabs'
        : 'search.recentlyAdded'
    if (!byKey.has(key)) {
      byKey.set(key, [])
      order.push(key)
    }
    byKey.get(key)!.push(hit)
  }
  return order.map((key) => ({ key, hits: byKey.get(key)! }))
}
