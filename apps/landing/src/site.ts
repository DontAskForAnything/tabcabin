export const repo = 'https://github.com/DontAskForAnything/tabhangar'
export const releases = `${repo}/releases/latest`
export const selfHostingGuide = `${repo}/blob/main/docs/self-hosting.md`

export interface FaqItem {
  q: string
  /** Plain text (also used for structured data). */
  a: string
  /** Optional HTML version with links. */
  html?: string
}

export const faq: FaqItem[] = [
  {
    q: 'Is TabHangar free?',
    a: 'Yes. TabHangar is open source under the MIT license, with no paid tier and no limits on how many tabs, groups or workspaces you keep.',
  },
  {
    q: 'Do I need an account or a server?',
    a: 'No. The extension works fully offline and keeps everything in your browser. A server is only needed if you want to sync between computers.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In your browser (IndexedDB), and — if you turn on sync — in an SQLite database on the server you run. Nothing is sent anywhere else and there is no telemetry.',
  },
  {
    q: 'How is it different from OneTab, Toby or Workona?',
    a: 'TabHangar combines kanban boards and a collections view with notes, to-dos and reminders, is open source, and syncs through your own server instead of a vendor cloud.',
    html: 'TabHangar combines kanban boards and a collections view with notes, to-dos and reminders, is open source, and syncs through your own server instead of a vendor cloud. See the <a class="font-medium text-accent-ink hover:underline" href="/alternatives/">comparisons</a>.',
  },
  {
    q: 'Can I import my existing tabs and bookmarks?',
    a: 'Yes: TabHangar backups, Toby and tabExtend exports, bookmark files from any browser or bookmark manager, OneTab lists, Chrome bookmark folders and your most visited sites. You can also save every open tab at once from the tabs panel, and export everything as JSON, a bookmarks file or CSV.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Chrome and other Chromium browsers such as Edge, Brave and Vivaldi. The board also opens in Chrome’s side panel.',
  },
  {
    q: 'What do I need to run the sync server?',
    a: 'Docker and a domain. A small VPS or a Raspberry Pi is plenty; the guide covers HTTPS, accounts, backups and updates.',
    html: 'Docker and a domain. A small VPS or a Raspberry Pi is plenty; the <a class="font-medium text-accent-ink hover:underline" href="/self-hosted-tab-manager">self-hosting overview</a> and the step-by-step guide cover HTTPS, accounts, backups and updates.',
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
