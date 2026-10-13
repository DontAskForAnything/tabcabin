import type { SharedGroup, SharedItem } from './store'

type Lang = 'en' | 'pl'

const TEXT = {
  en: {
    footer: 'Shared from TabCabin · read only',
    goneTitle: 'This link no longer works',
    goneText: 'Its owner stopped sharing the group, or deleted it.',
    empty: 'Nothing here yet.',
    links: (n: number) => `${n} ${n === 1 ? 'link' : 'links'}`,
  },
  pl: {
    footer: 'Udostępnione z TabCabin · tylko do odczytu',
    goneTitle: 'Ten link już nie działa',
    goneText: 'Właściciel przestał udostępniać tę grupę albo ją usunął.',
    empty: 'Na razie nic tu nie ma.',
    links: (n: number) =>
      `${n} ${n === 1 ? 'link' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'linki' : 'linków'}`,
  },
} satisfies Record<Lang, unknown>

/** Polish for browsers that prefer it, English otherwise. */
export function pageLanguage(acceptLanguage: string | undefined): Lang {
  return /^pl\b/i.test((acceptLanguage ?? '').trim()) ? 'pl' : 'en'
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )

/** Only web addresses become links; anything else is shown as text. */
const webUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null)

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** The colors of notes, as in the extension (light, dark). */
const NOTE: Record<string, [string, string, string, string]> = {
  rose: ['#ffdadd', '#4a1b21', '#3a2226', '#ffd9de'],
  amber: ['#ffe9ad', '#4a3510', '#3a3120', '#ffe7a8'],
  lime: ['#d8f5c6', '#1f3a12', '#25331d', '#d6f3c4'],
  peach: ['#ffdeca', '#4a2614', '#3a2a20', '#ffdcc7'],
  pink: ['#fbd6f2', '#45173d', '#37233a', '#f9d3f0'],
  lilac: ['#e4dcff', '#2b1f57', '#2a2640', '#e1d8ff'],
  sky: ['#d2e8ff', '#12304d', '#1f2d3b', '#cfe6ff'],
  teal: ['#ccf2ea', '#0f3a33', '#1c3330', '#c8efe7'],
  sand: ['#efe7da', '#3c3222', '#302b24', '#ede4d6'],
}

const noteStyle = (color: string | null) => {
  const [bg, ink, darkBg, darkInk] = NOTE[color ?? 'amber'] ?? NOTE.amber!
  return `--bg:${bg};--ink:${ink};--dark-bg:${darkBg};--dark-ink:${darkInk}`
}

/** The calm, earthy tones of the extension's letter tiles, picked the same way from the host. */
const TILES = [
  '#1f4a3a',
  '#2c5f63',
  '#3d5a73',
  '#4f6b4a',
  '#7a6230',
  '#8a4b3a',
  '#5a3d55',
  '#5b4636',
  '#2b2f2d',
]

function tile(seed: string): { letter: string; color: string } {
  const clean = seed.replace(/^(https?:\/\/)?(www\.)?/i, '').trim()
  let hash = 0
  for (const char of clean.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return {
    letter: (clean.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase(),
    color: TILES[Math.abs(hash) % TILES.length]!,
  }
}

function linkRow(item: SharedItem): string {
  const url = webUrl(item.url)
  const title = escape(item.title || (item.url ? host(item.url) : ''))
  const { letter, color } = tile(item.url ? host(item.url) : item.title)
  const body = `<span class="tile" style="background:${color}" aria-hidden="true">${escape(letter)}</span><span class="label"><b>${title}</b>${
    item.url ? `<small>${escape(host(item.url))}</small>` : ''
  }</span>`
  const comment = item.text
    ? `<p class="note" style="${noteStyle(item.color)}">${escape(item.text)}</p>`
    : ''
  return `<li class="link">${
    url
      ? `<a href="${escape(url)}" rel="noopener noreferrer nofollow ugc" target="_blank">${body}</a>`
      : `<span class="row">${body}</span>`
  }${comment}</li>`
}

function itemRow(item: SharedItem, children: SharedItem[]): string {
  if (item.kind === 'note' && item.todo)
    return `<li class="todo${item.done ? ' done' : ''}"><span class="box" aria-hidden="true">${
      item.done ? '✓' : ''
    }</span><span>${escape(item.text)}</span></li>`
  if (item.kind === 'note')
    return `<li class="note" style="${noteStyle(item.color)}">${escape(item.text)}</li>`
  if (item.kind === 'stack')
    return `<li class="stack"><ul>${children.map(linkRow).join('')}</ul></li>`
  return linkRow(item)
}

const STYLE = `
:root{--canvas:#f2eee5;--card:#fff;--ink:#0f1110;--ink-2:#3a3f3c;--ink-3:#5d635f;--line:#e7e2d8;--subtle:#f5f2eb;--accent:#1f4a3a;--on-accent:#faf6ee;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--canvas:#0f1110;--card:#181b19;--ink:#f2f4f2;--ink-2:#c9cec9;--ink-3:#9aa29c;--line:#2b302c;--subtle:#202421;--accent:#6db592;--on-accent:#0f1110}
.note{background:var(--dark-bg)!important;color:var(--dark-ink)!important}}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:640px;margin:0 auto;padding:40px 16px 56px}
header{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.emoji{font-size:42px;line-height:1}
h1{margin:0;font-size:26px;letter-spacing:-.02em}
.meta{margin:2px 0 0;color:var(--ink-3);font-size:13px}
ul{list-style:none;margin:0;padding:0}
.items{display:flex;flex-direction:column;gap:6px;background:var(--card);border-radius:22px;padding:14px;box-shadow:0 1px 2px rgb(15 17 16/.04),0 10px 28px -8px rgb(15 17 16/.09)}
.link a,.link .row{display:flex;align-items:center;gap:12px;padding:8px;border-radius:13px;color:inherit;text-decoration:none}
.link a:hover{background:var(--subtle)}
.tile{flex:none;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;color:#fff;font-weight:700}
.label{min-width:0;display:flex;flex-direction:column}
.label b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.label small{color:var(--ink-3);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.note{margin:0;padding:10px 12px;border-radius:12px;background:var(--bg);color:var(--ink);white-space:pre-wrap;overflow-wrap:anywhere}
.link .note{margin:0 8px 6px 56px;font-size:13.5px}
.todo{display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border-radius:12px;background:var(--subtle);white-space:pre-wrap;overflow-wrap:anywhere}
.box{flex:none;display:flex;align-items:center;justify-content:center;width:20px;height:20px;margin-top:1px;border:1.5px solid var(--ink-3);border-radius:6px;font-size:13px;font-weight:700}
.done{color:var(--ink-3);text-decoration:line-through}
.done .box{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.stack ul{display:flex;flex-direction:column;gap:2px;padding:4px;border:1px dashed var(--line);border-radius:14px}
.empty{padding:24px;text-align:center;color:var(--ink-3)}
footer{margin-top:22px;text-align:center;color:var(--ink-3);font-size:12.5px}
`

function document(lang: Lang, title: string, body: string): string {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)}</title><style>${STYLE}</style></head><body><main>${body}<footer>${escape(TEXT[lang].footer)}</footer></main></body></html>`
}

/** The read-only page of a shared group. */
export function sharedPage(group: SharedGroup, lang: Lang): string {
  const top = group.items.filter((item) => item.parentId === null)
  const links = group.items.filter((item) => item.kind === 'link').length
  const rows = top
    .map((item) =>
      itemRow(
        item,
        group.items.filter((child) => child.parentId === item.id),
      ),
    )
    .join('')
  const title = `${group.emoji} ${group.title}`.trim()
  return document(
    lang,
    title,
    `<header><span class="emoji" aria-hidden="true">${escape(group.emoji)}</span><div><h1>${escape(
      group.title,
    )}</h1><p class="meta">${escape(TEXT[lang].links(links))}</p></div></header><ul class="items">${
      rows || `<li class="empty">${escape(TEXT[lang].empty)}</li>`
    }</ul>`,
  )
}

/** What a link that no longer works shows. */
export function gonePage(lang: Lang): string {
  const text = TEXT[lang]
  return document(
    lang,
    text.goneTitle,
    `<header><span class="emoji" aria-hidden="true">🍂</span><div><h1>${escape(
      text.goneTitle,
    )}</h1><p class="meta">${escape(text.goneText)}</p></div></header>`,
  )
}
