/** An address from the build environment, without a trailing slash; empty means not set. */
function address(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '') || undefined
}

/**
 * Where people get the extension (the Chrome Web Store listing or a release). Until it is set, the
 * download buttons say "Coming soon".
 */
export const extensionUrl = address(import.meta.env.EXTENSION_URL)

/**
 * The extension's id when EXTENSION_URL is its Chrome Web Store listing. With it, "Add to
 * TabCabin" asks an installed TabCabin to add the board; without it the button opens the store.
 */
export const extensionId = extensionUrl?.match(/\/([a-p]{32})(?:[/?#]|$)/)?.[1]

/** The public GitHub repository. Until it is set, links to the code, guide and changelog stay out. */
export const repo = address(import.meta.env.REPO_URL)
export const selfHostingGuide = repo && `${repo}/blob/main/docs/self-hosting.md`
export const changelog = repo && `${repo}/blob/main/CHANGELOG.md`

/**
 * Visit counts with Umami (no cookies, no personal data), only when both are set: the address of
 * its tracker script and the website id from the Umami dashboard.
 */
const umamiScript = address(import.meta.env.UMAMI_SCRIPT_URL)
const umamiId = import.meta.env.UMAMI_WEBSITE_ID?.trim()
export const analytics = umamiScript && umamiId ? { script: umamiScript, id: umamiId } : undefined

/** Tools with a comparison page under /alternatives/ (each ends with a guide for moving over). */
export const comparisons = [
  { name: 'OneTab', slug: 'onetab' },
  { name: 'Toby', slug: 'toby' },
  { name: 'Workona', slug: 'workona' },
  { name: 'tabExtend', slug: 'tabextend' },
  { name: 'Session Buddy', slug: 'session-buddy' },
]

export interface FaqItem {
  q: string
  /** Plain text (also used for structured data). */
  a: string
  /** Optional HTML version with links. */
  html?: string
}

export const faq: FaqItem[] = [
  {
    q: 'Is TabCabin free?',
    a: 'Yes. The extension is free and open source under the MIT license, with no limits on how many tabs, groups or workspaces you keep. Running your own sync server is free too.',
  },
  {
    q: 'Do I need an account or a server?',
    a: 'No. The extension works fully offline and keeps everything in your browser. Sign in only when you want the same boards on more than one computer; you never need a server of your own.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In your browser (IndexedDB). When you sign in to sync, a copy is kept on the TabCabin sync server, or on your own server if you run one. Nothing is sent anywhere else and there is no telemetry.',
  },
  {
    q: 'How is it different from OneTab, Toby, Workona, tabExtend or Session Buddy?',
    a: 'TabCabin combines kanban boards and a collections view with notes, to-dos and reminders, is open source, works without an account, and lets you run the sync server yourself.',
    html: 'TabCabin combines kanban boards and a collections view with notes, to-dos and reminders, is open source, works without an account, and lets you run the sync server yourself. See the <a class="font-medium text-accent-ink hover:underline" href="/alternatives/">comparisons</a>.',
  },
  {
    q: 'Can I import my existing tabs and bookmarks?',
    a: 'Yes: TabCabin backups, Toby and tabExtend exports, bookmark files from any browser or bookmark manager, OneTab lists, Chrome bookmark folders and your most visited sites. You can also save every open tab at once from the tabs panel, and export everything as JSON, a bookmarks file or CSV.',
    html: 'Yes: TabCabin backups, Toby and tabExtend exports, bookmark files from any browser or bookmark manager, OneTab lists, Chrome bookmark folders and your most visited sites. You can also save every open tab at once from the tabs panel, and export everything as JSON, a bookmarks file or CSV. Step by step: moving from <a class="font-medium text-accent-ink hover:underline" href="/alternatives/toby/#moving">Toby</a>, <a class="font-medium text-accent-ink hover:underline" href="/alternatives/onetab/#moving">OneTab</a>, <a class="font-medium text-accent-ink hover:underline" href="/alternatives/workona/#moving">Workona</a>, <a class="font-medium text-accent-ink hover:underline" href="/alternatives/tabextend/#moving">tabExtend</a> or <a class="font-medium text-accent-ink hover:underline" href="/alternatives/session-buddy/#moving">Session Buddy</a>.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Chrome and other Chromium browsers such as Edge, Brave and Vivaldi. The board also opens in Chrome’s side panel.',
  },
  {
    q: 'Can I run the sync server myself?',
    a: 'Yes, if you want your data only on your own machine. You need Docker and a domain; a small VPS or a Raspberry Pi is plenty. You then build the extension with your server’s address, and the guide covers HTTPS, accounts, backups and updates.',
    html: 'Yes, if you want your data only on your own machine. You need Docker and a domain; a small VPS or a Raspberry Pi is plenty. You then build the extension with your server’s address. The <a class="font-medium text-accent-ink hover:underline" href="/self-hosted-tab-manager/">self-hosting overview</a> and the step-by-step guide cover HTTPS, accounts, backups and updates.',
  },
]

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** HTML where hyphenated words (to-dos, open-source…) never break across lines. */
export function nb(text: string): string {
  return escapeHtml(text).replace(
    /[\p{L}\p{N}’'+]+(?:-[\p{L}\p{N}’'+]+)+/gu,
    (word) => `<span class="whitespace-nowrap">${word}</span>`,
  )
}
