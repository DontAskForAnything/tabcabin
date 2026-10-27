/**
 * The guides under /guides/. Each one answers a question people search for, and goes live on its
 * `published` day: the site only builds the guides whose day has come, and the Guides workflow
 * (.github/workflows/guides.yml) rebuilds the site on those mornings. The text of each guide is
 * the .astro file with the same name in this folder.
 */
export interface Guide {
  slug: string
  title: string
  /** Meta description for search results (up to ~155 characters). */
  description: string
  /** One line for the list of guides. */
  summary: string
  /** Short name for the breadcrumb trail. */
  crumb: string
  /** The day it goes live, as YYYY-MM-DD (UTC). */
  published: string
  minutes: number
}

const all: Guide[] = [
  {
    slug: 'save-all-open-tabs-chrome',
    title: 'How to save all your open tabs in Chrome',
    description:
      'Three ways to save every open tab in Chrome: a bookmarks folder, a saved tab group or a board with notes and search. Step by step, with the shortcuts.',
    summary: 'A bookmarks folder, a saved tab group or a board, with the shortcuts for each.',
    crumb: 'Save all open tabs',
    published: '2026-10-18',
    minutes: 4,
  },
  {
    slug: 'export-onetab-tabs',
    title: 'How to export your tabs from OneTab',
    description:
      'OneTab keeps your tabs in one browser only. Export every list to a text file in four steps, keep it as a backup and move it to a board with notes.',
    summary: 'Keep a backup of every OneTab list and move it to a board with notes and search.',
    crumb: 'Export from OneTab',
    published: '2026-10-20',
    minutes: 3,
  },
  {
    slug: 'sync-tabs-without-google-account',
    title: 'How to sync tabs between computers without a Google account',
    description:
      'Chrome syncs tabs only through a Google account. Three other ways to keep the same tabs on every computer: a file, a TabCabin account or your own server.',
    summary: 'A bookmarks file, an account with a username and password, or a server of your own.',
    crumb: 'Sync without a Google account',
    published: '2026-10-27',
    minutes: 4,
  },
  {
    slug: 'change-new-tab-page-chrome',
    title: 'How to change the new tab page in Chrome',
    description:
      'Chrome lets you change the look of its new tab page, not what it shows. How to customize it, and how to put your own boards of links there instead.',
    summary: 'Customize Chrome’s own page, or put your own boards there with an extension.',
    crumb: 'Change the new tab page',
    published: '2026-11-03',
    minutes: 4,
  },
]

// `astro dev` shows every guide, so the next ones can be checked before their day.
const today = new Date().toISOString().slice(0, 10)

/** The guides that are live, newest first. */
export const guides = all
  .filter((guide) => import.meta.env.DEV || guide.published <= today)
  .sort((a, b) => b.published.localeCompare(a.published))

export const guidePath = (slug: string) => `/guides/${slug}/`
