import Fuse, { type FuseResultMatch, type IFuseOptions } from 'fuse.js'
import type { SearchDoc } from '@/db/search'

export interface SearchHit {
  doc: SearchDoc
  /** [start, end] ranges (inclusive) of the title that matched. */
  titleRanges: [number, number][]
}

const options: IFuseOptions<SearchDoc> = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'url', weight: 1 },
    { name: 'text', weight: 1.2 },
  ],
  threshold: 0.34,
  ignoreLocation: true,
  includeMatches: true,
  minMatchCharLength: 2,
}

/**
 * `#name` at the start keeps the items with a tag whose name starts with it (any case); what
 * follows searches among those, or they come newest first.
 */
function byTag(docs: readonly SearchDoc[], query: string) {
  const match = /^#(\S+)\s*(.*)$/.exec(query)
  if (!match) return null
  const wanted = match[1]!.toLocaleLowerCase()
  const tagged = docs.filter((doc) =>
    doc.tags?.some((name) => name.toLocaleLowerCase().startsWith(wanted)),
  )
  return { docs: tagged, rest: match[2]!.trim() }
}

export function search(docs: readonly SearchDoc[], query: string, limit = 40): SearchHit[] {
  let q = query.trim()
  let pool = docs
  if (!q) return []
  const tagged = byTag(docs, q)
  if (tagged) {
    if (!tagged.rest)
      return [...tagged.docs]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((doc) => ({ doc, titleRanges: [] }))
    pool = tagged.docs
    q = tagged.rest
  }
  const fuse = new Fuse(pool, options)
  return fuse.search(q, { limit }).map((result) => ({
    doc: result.item,
    titleRanges: rangesFor(result.matches, 'title'),
  }))
}

function rangesFor(
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): [number, number][] {
  const match = matches?.find((m) => m.key === key)
  if (!match) return []
  // Keep meaningful ranges only (Fuse also reports single scattered letters).
  return match.indices
    .filter(([start, end]) => end - start >= 1)
    .map(([start, end]) => [start, end])
}

/** Splits text into plain and highlighted parts. */
export function highlightParts(
  text: string,
  ranges: readonly [number, number][],
): { text: string; hit: boolean }[] {
  if (ranges.length === 0) return [{ text, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start < cursor) continue
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false })
    parts.push({ text: text.slice(start, end + 1), hit: true })
    cursor = end + 1
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
  return parts
}

/** Recently added items (groups are only found by name). */
export function recentDocs(docs: readonly SearchDoc[], limit = 8): SearchDoc[] {
  return docs
    .filter((doc) => doc.kind !== 'group')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}
