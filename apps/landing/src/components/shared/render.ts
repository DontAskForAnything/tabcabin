import { displayHost, el } from './dom'
import type { SharedGroup, SharedItem } from './load'
import { siteTile } from './siteIcon'

const NOTE_COLORS = new Set([
  'rose',
  'amber',
  'lime',
  'peach',
  'pink',
  'lilac',
  'sky',
  'teal',
  'sand',
])
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** Only web addresses become links; anything else is shown as text. */
const webUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null)

function note(item: SharedItem, color: string): HTMLElement {
  if (item.todo) {
    const row = el(
      'li',
      `flex items-start gap-2.5 rounded-xl bg-subtle px-3 py-2.5 text-[14.5px] leading-snug${
        item.done ? ' text-ink-3' : ''
      }`,
    )
    const box = el(
      'span',
      `mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-[11px] font-bold ${
        item.done ? 'border-accent bg-accent text-on-accent' : 'border-ink-3'
      }`,
      item.done ? '✓' : '',
    )
    box.ariaHidden = 'true'
    const text = el(
      'span',
      `min-w-0 whitespace-pre-wrap break-words${item.done ? ' line-through' : ''}`,
    )
    if (item.done) text.append(el('span', 'sr-only', 'Done: '))
    text.append(item.text)
    row.append(box, text)
    return row
  }
  const row = el(
    'li',
    'rounded-xl px-3 py-2.5 text-[14.5px] leading-snug whitespace-pre-wrap break-words',
    item.text,
  )
  const tint = item.color && NOTE_COLORS.has(item.color) ? item.color : color
  row.style.background = `var(--note-${tint}-bg)`
  row.style.color = `var(--note-${tint}-ink)`
  return row
}

function link(item: SharedItem, pinned: SharedItem[]): HTMLElement {
  const row = el('li')
  const url = webUrl(item.url)
  const label = el('span', 'flex min-w-0 flex-col')
  label.append(
    el(
      'span',
      'truncate text-[15px] font-semibold',
      item.title || (item.url ? displayHost(item.url) : ''),
    ),
  )
  if (item.url) label.append(el('span', 'truncate text-[12.5px] text-ink-3', displayHost(item.url)))
  const body = [siteTile(item), label]
  if (url) {
    const anchor = el(
      'a',
      'flex items-center gap-3 rounded-[13px] p-2 transition-colors hover:bg-subtle',
    )
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer nofollow ugc'
    anchor.append(...body)
    row.append(anchor)
  } else {
    const plain = el('div', 'flex items-center gap-3 p-2')
    plain.append(...body)
    row.append(plain)
  }
  // The note written on the link, then the ones pinned to it.
  const notes = [
    ...(item.text ? [note({ ...item, todo: false }, 'sky')] : []),
    ...pinned.filter((child) => child.kind === 'note').map((child) => note(child, 'amber')),
  ]
  if (notes.length) {
    const list = el('ul', 'mr-2 mb-1.5 ml-14 flex flex-col gap-1 text-[13.5px]')
    list.append(...notes)
    row.append(list)
  }
  return row
}

function stack(item: SharedItem, inside: (item: SharedItem) => SharedItem[]): HTMLElement {
  const box = el('li', 'rounded-[14px] border border-dashed border-line p-1')
  if (item.title)
    box.append(el('p', 'px-2 pt-1.5 pb-0.5 text-[13px] font-semibold text-ink-2', item.title))
  const list = el('ul', 'flex flex-col gap-0.5')
  list.append(...inside(item).map((child) => link(child, inside(child))))
  box.append(list)
  return box
}

/** How many links, when it was shared and, from a later day on, when it last changed. */
export function groupMeta(group: SharedGroup): string {
  const links = group.items.filter((item) => item.kind === 'link').length
  const shared = day.format(group.sharedAt)
  const updated = day.format(group.updatedAt)
  return [
    `${links} ${links === 1 ? 'link' : 'links'}`,
    `shared ${shared}`,
    ...(group.updatedAt > group.sharedAt && updated !== shared ? [`updated ${updated}`] : []),
  ].join(' · ')
}

/** The group's rows, in the app's look: links with their sites' icons, notes, to-dos, stacks. */
export function groupRows(group: SharedGroup): HTMLElement[] {
  const inside = (parent: SharedItem) => group.items.filter((item) => item.parentId === parent.id)
  return group.items
    .filter((item) => item.parentId === null)
    .map((item) =>
      item.kind === 'note'
        ? note(item, 'amber')
        : item.kind === 'stack'
          ? stack(item, inside)
          : link(item, inside(item)),
    )
}
