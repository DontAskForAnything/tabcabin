import { importableUrl, type Outline, type OutlineLink } from './outline'

/*
 * Bookmark files in the Netscape format: what browsers, Toby ("HTML"), Raindrop, Pocket and most
 * bookmark tools export. A small tokenizer is enough (and works without a DOM): `<H3>` names a
 * folder, the next `<DL>` opens it, `<A HREF>` is a link and `<DD>` describes the link before it.
 *
 * Every folder with links becomes a group; its parent folder becomes the category.
 */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

const clean = (html: string) =>
  decode(html.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()

function attribute(attributes: string, key: string): string {
  const match = new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(
    attributes,
  )
  return decode(match?.[1] ?? match?.[2] ?? match?.[3] ?? '')
}

/** Index of the next match at or after `from` (-1 if none), without copying the text. */
function indexAfter(pattern: RegExp, text: string, from: number): number {
  pattern.lastIndex = from
  return pattern.exec(text)?.index ?? -1
}

export function isBookmarksHtml(text: string): boolean {
  const head = text.slice(0, 4000)
  return (
    /<!DOCTYPE\s+NETSCAPE-Bookmark-file/i.test(head) ||
    (/<dl/i.test(text) && /<a\s[^>]*href/i.test(text))
  )
}

interface Folder {
  name: string
  parent: Folder | null
  links: OutlineLink[]
}

export function parseBookmarksHtml(text: string): Outline {
  const root: Folder = { name: '', parent: null, links: [] }
  const folders: Folder[] = [root]
  let current = root
  let pending: string | null = null
  let lastLink: OutlineLink | null = null

  const token = /<(\/?)(dl|h3|a|dd)\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = token.exec(text))) {
    const [, closing, rawTag, attributes = ''] = match
    const tag = rawTag!.toLowerCase()
    const after = token.lastIndex
    if (tag === 'dl') {
      if (closing) current = current.parent ?? root
      else if (pending !== null) {
        const folder: Folder = { name: pending, parent: current, links: [] }
        folders.push(folder)
        current = folder
        pending = null
      }
      lastLink = null
    } else if (tag === 'h3' && !closing) {
      const end = text.indexOf('</', after)
      pending = clean(text.slice(after, end < 0 ? undefined : end))
      lastLink = null
    } else if (tag === 'a' && !closing) {
      // Stop at the next entry too, in case a file forgets `</A>`.
      const end = indexAfter(/<\/a>|<(dt|dl|\/dl)\b/gi, text, after)
      const url = importableUrl(attribute(attributes, 'href'))
      const added = Number(attribute(attributes, 'add_date'))
      lastLink = null
      if (url) {
        lastLink = {
          url,
          title: clean(text.slice(after, end < 0 ? undefined : end)) || url,
          createdAt: Number.isFinite(added) && added > 0 ? added * 1000 : undefined,
        }
        current.links.push(lastLink)
      }
    } else if (tag === 'dd' && !closing && lastLink) {
      const end = indexAfter(/<(dt|dl|\/dl)\b/gi, text, after)
      lastLink.note = clean(text.slice(after, end < 0 ? undefined : end))
      lastLink = null
    }
  }

  const categories = new Map<string, { title: string; links: OutlineLink[] }[]>()
  for (const folder of folders) {
    if (folder.links.length === 0) continue
    const category = folder.parent && folder.parent !== root ? folder.parent.name : ''
    const group = { title: folder.name, links: folder.links }
    categories.set(category, [...(categories.get(category) ?? []), group])
  }
  return { categories: [...categories].map(([name, groups]) => ({ name, groups })) }
}
