import { importableUrl, type Outline, type OutlineGroup, type OutlineLink } from './outline'

/*
 * Toby JSON exports. Older ones are `{ version, lists: [{ title, cards: [...] }] }`; exports of a
 * whole organization nest the lists in named groups or spaces. Rather than relying on one exact
 * shape, the parser walks the file: every object with a `cards` array is a collection (→ group),
 * and the nearest named object that holds `lists` is its space (→ category).
 */

type Raw = Record<string, unknown>

const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown) => (typeof value === 'string' ? value : '')
const name = (raw: Raw) => str(raw.title) || str(raw.name)

/** Tags may be plain strings or `{ name }` / `{ title }` objects. */
function tags(raw: Raw): string[] {
  const values = [raw.tags, raw.labels].flatMap((value) => (Array.isArray(value) ? value : []))
  return values
    .map((tag) => (isObject(tag) ? name(tag) : str(tag)))
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function card(raw: Raw): OutlineLink | null {
  const url = importableUrl(str(raw.url))
  if (!url) return null
  const description = str(raw.customDescription) || str(raw.description)
  const hashtags = tags(raw)
    .map((tag) => `#${tag.replace(/\s+/g, '-')}`)
    .join(' ')
  const created = Date.parse(str(raw.createdAt) || str(raw.created))
  return {
    url,
    title: str(raw.customTitle) || str(raw.title) || url,
    note: [description.trim(), hashtags].filter(Boolean).join('\n'),
    createdAt: Number.isFinite(created) ? created : undefined,
  }
}

function collection(raw: Raw): OutlineGroup {
  const notes = [str(raw.notes), str(raw.note), str(raw.description)].filter((text) => text.trim())
  return {
    title: name(raw),
    links: (raw.cards as unknown[]).filter(isObject).flatMap((c) => card(c) ?? []),
    notes,
  }
}

/** Collects collections with the name of the space they are in ('' for none). */
function walk(value: unknown, space: string, out: { space: string; group: OutlineGroup }[]) {
  if (Array.isArray(value)) {
    for (const child of value) walk(child, space, out)
    return
  }
  if (!isObject(value)) return
  if (Array.isArray(value.cards)) {
    out.push({ space, group: collection(value) })
    return
  }
  const here = Array.isArray(value.lists) && name(value) ? name(value) : space
  for (const child of Object.values(value)) walk(child, here, out)
}

export function isTobyExport(value: unknown): boolean {
  const found: { space: string; group: OutlineGroup }[] = []
  walk(value, '', found)
  return found.length > 0
}

/** Toby collections as an outline: spaces become categories, collections become groups. */
export function parseToby(value: unknown): Outline {
  const found: { space: string; group: OutlineGroup }[] = []
  walk(value, '', found)
  const categories = new Map<string, OutlineGroup[]>()
  for (const { space, group } of found) {
    categories.set(space, [...(categories.get(space) ?? []), group])
  }
  return {
    categories: [...categories].map(([space, groups]) => ({ name: space, groups })),
  }
}
