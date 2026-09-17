import { importableUrl, type Outline, type OutlineGroup } from './outline'

/*
 * Plain lists of links: Toby's TXT export, OneTab's "Export URLs" (`url | title`, one tab group
 * per paragraph), Markdown links or anything pasted from a notes app. Blank lines start a new group; a line
 * without an address at the top of a paragraph names that group.
 */

const URL_PATTERN = /\b(?:https?|ftp|file):\/\/[^\s<>"'|]+/i

export function isUrlList(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  const withUrl = lines.filter((line) => URL_PATTERN.test(line)).length
  return withUrl > 0 && withUrl >= lines.length / 2
}

export function isOneTabExport(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  return (
    lines.length > 0 &&
    lines.every((line) => /^\S+:\/\/\S+ \| /.test(line) || !URL_PATTERN.test(line))
  )
}

export function parseUrlList(text: string): Outline {
  const groups: OutlineGroup[] = []
  let group: OutlineGroup | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      group = null
      continue
    }
    const markdown = /\[([^\]]*)\]\((\S+?)\)/.exec(line)
    if (markdown && importableUrl(markdown[2]!)) {
      if (!group) groups.push((group = { title: '', links: [] }))
      group.links.push({ url: markdown[2]!, title: markdown[1]!.trim() || markdown[2]! })
      continue
    }
    const match = URL_PATTERN.exec(line)
    const url = match ? importableUrl(match[0].replace(/[),.;:]+$/, '')) : null
    if (!url) {
      // A heading at the top of a paragraph names the group; other text is ignored.
      if (!group)
        groups.push((group = { title: line.replace(/^#+\s*/, '').slice(0, 120), links: [] }))
      continue
    }
    if (!group) groups.push((group = { title: '', links: [] }))
    const rest = (line.slice(0, match!.index) + line.slice(match!.index + match![0].length))
      .replace(/^\s*[|\-–—:]\s*|\s*[|\-–—:]\s*$/g, '')
      .trim()
    group.links.push({ url, title: rest || url })
  }
  return { categories: [{ name: '', groups: groups.filter((g) => g.links.length > 0) }] }
}
