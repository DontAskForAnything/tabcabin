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
]

// `astro dev` shows every guide, so the next ones can be checked before their day.
const today = new Date().toISOString().slice(0, 10)

/** The guides that are live, newest first. */
export const guides = all
  .filter((guide) => import.meta.env.DEV || guide.published <= today)
  .sort((a, b) => b.published.localeCompare(a.published))

export const guidePath = (slug: string) => `/guides/${slug}/`
