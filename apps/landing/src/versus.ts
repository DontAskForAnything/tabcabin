/**
 * Two other tab managers compared head to head under /alternatives/<a>-vs-<b>/, for people who
 * search for "Toby vs OneTab" and the like, with TabCabin as the third option. Keep the facts
 * fair, checked against their own websites, and update `checked` and `updated` when they change.
 */
type Cell = true | false | string

export interface Versus {
  slug: string
  names: [string, string]
  /** Their pages under /alternatives/, for the steps to move over. */
  slugs: [string, string]
  /** The title in search results (up to ~50 characters). */
  title: string
  /** Meta description for search results (up to ~155 characters). */
  description: string
  /** Short name for links and the breadcrumb trail. */
  crumb: string
  /** The month the facts about the two tools were checked. */
  checked: string
  published: string
  updated?: string
  intro: string
  /** The answer in two sentences, for readers in a hurry. */
  short: string
  /** Feature, the first tool, the second one, TabCabin. */
  rows: [string, Cell, Cell, Cell][]
  differences: [string, string][]
  /** When each of the two fits better. */
  pick: [string[], string[]]
  /** Why TabCabin may suit better than both. */
  third: string[]
}

export const versus: Versus[] = [
  {
    slug: 'toby-vs-onetab',
    names: ['Toby', 'OneTab'],
    slugs: ['toby', 'onetab'],
    title: 'Toby vs OneTab: which to pick, and a third option',
    description:
      'Toby vs OneTab compared: a board with an account and a 60-tab free limit, or a free list with paid sync. The differences, prices and a free third option.',
    crumb: 'Toby vs OneTab',
    checked: 'November 2026',
    published: '2026-11-02',
    intro:
      'Toby and OneTab both promise fewer open tabs, but they work in different ways: Toby is a board of saved tabs on the new tab page, OneTab a list you close tabs into. Here is how they compare, and when a third option fits better.',
    short:
      'OneTab is a free list for closing tabs fast, with no account; Toby is a board on the new tab page that syncs, but needs an account and stops saving at 60 tabs on its free plan. If you want the board without the account or the limit, with notes, to-dos and reminders, TabCabin fits best.',
    rows: [
      [
        'How it keeps tabs',
        'Collections on a board',
        'Groups on one list page',
        'Groups on boards or as collections',
      ],
      ['Saved tabs on the new tab page', true, false, true],
      ['Save a whole window in one click', true, true, true],
      [
        'Notes and to-dos',
        'Notes with checklists',
        'Notes and tasks',
        'Notes, to-dos and reminders',
      ],
      ['Reminders', false, false, true],
      ['Search', 'Saved and open tabs', 'Saved tabs', 'Saved and open tabs, bookmarks'],
      ['Works without an account', false, true, true],
      [
        'Sync between computers',
        'Included, with an account',
        'Paid add-on',
        'Sign in, or your own server',
      ],
      ['Share a list as a web page', true, true, 'Read-only link, when signed in'],
      [
        'Price',
        'Free up to 60 tabs per workspace, paid from $4.50/month',
        'Free; sync US$39.99 a year',
        'Free app, free self-hosting',
      ],
      ['Browsers', 'Chrome, Edge, Firefox', 'Chrome, Firefox, Edge, Safari', 'Chrome, Edge, Brave'],
      ['Open source', false, false, 'MIT'],
    ],
    differences: [
      [
        'A board or a list',
        'Toby replaces the new tab page with a board of collections, sorted into spaces and workspaces, for the tabs you keep coming back to. OneTab is a memory saver: one click closes the tabs of a window and keeps them as a group on its list page, newest on top. Version 2 added folders, stars, notes and tasks to that list.',
      ],
      [
        'Account and privacy',
        'Toby needs a free account: your tabs live in its cloud, which also syncs them between computers and phones. OneTab needs no sign-up and keeps everything in the browser, so removing the extension removes the list unless you pay for its Backup & Sync.',
      ],
      [
        'Limits and price',
        'Toby’s free plan stops saving new tabs at 60 per workspace; the Productivity plan costs $6 a month, or $4.50 a month billed yearly. OneTab is free with no limit, and its end-to-end encrypted sync costs US$39.99 a year.',
      ],
      [
        'Getting tabs back',
        'Toby opens all the tabs of a collection at once. OneTab restores a group into this window, a new one or tab by tab, and removes it from the list unless you lock it. Neither keeps a history of past sessions.',
      ],
    ],
    pick: [
      [
        'You want saved tabs on every new tab, sorted into collections.',
        'You share collections with a team, or want phone apps to look through them.',
        'Paying is fine once you pass 60 saved tabs.',
      ],
      [
        'You mostly want to close many tabs fast and free up memory.',
        'You want no account, and a list page is enough.',
        'You also use Firefox or Safari.',
      ],
    ],
    third: [
      'A board on every new tab, like Toby’s, with no account and no limit on saved tabs.',
      'A whole window closed into one group in one click, like OneTab, to sort later.',
      'Notes, to-dos and reminders next to the links, and Ctrl+K search over saved tabs, open tabs and bookmarks.',
      'Sync between computers when you sign in, or through a server you run yourself.',
    ],
  },
  {
    slug: 'onetab-vs-session-buddy',
    names: ['OneTab', 'Session Buddy'],
    slugs: ['onetab', 'session-buddy'],
    title: 'OneTab vs Session Buddy: which one to pick',
    description:
      'OneTab vs Session Buddy compared: closing tabs into a list, or recording sessions with crash recovery. Sync, search, formats and a free third option.',
    crumb: 'OneTab vs Session Buddy',
    checked: 'November 2026',
    published: '2026-11-02',
    intro:
      'OneTab and Session Buddy are the two classic ways to stop losing tabs, and both are free with no account. They solve different problems, though: one frees memory, the other remembers your sessions.',
    short:
      'OneTab closes tabs into a list to save memory; Session Buddy records your sessions and brings windows back after a crash. If the tabs you keep should stay in sight, sorted into groups with notes, to-dos and reminders and synced between computers, TabCabin fits best.',
    rows: [
      [
        'What it does',
        'Closes tabs into a list',
        'Saves and restores sessions',
        'Keeps tabs on boards',
      ],
      ['Save a whole window in one click', true, true, true],
      ['Closes the tabs as it saves them', true, 'No, tabs stay open', 'Your choice'],
      ['History of past sessions, crash recovery', false, true, false],
      [
        'Restore a window',
        'Here, in a new window or tab by tab',
        'As it was, positions and pinned tabs included',
        'As a new window or a tab group',
      ],
      ['Notes and to-dos', 'Notes and tasks', false, 'Notes, to-dos and reminders'],
      ['Search', 'Saved tabs', 'Saved and open tabs, history', 'Saved and open tabs, bookmarks'],
      ['Saved tabs on the new tab page', false, false, true],
      ['Works without an account', true, true, true],
      ['Sync between computers', 'Paid add-on', 'Backup files only', 'Sign in, or your own server'],
      [
        'Import and export',
        'List of links, HTML',
        'Many formats, JSON and CSV included',
        'JSON, bookmarks file, CSV',
      ],
      [
        'Price',
        'Free; sync US$39.99 a year',
        'Free, with donations',
        'Free app, free self-hosting',
      ],
      [
        'Browsers',
        'Chrome, Firefox, Edge, Safari',
        'Chrome (Edge and Brave work)',
        'Chrome, Edge, Brave',
      ],
      ['Open source', false, false, 'MIT'],
    ],
    differences: [
      [
        'Closing tabs or keeping sessions',
        'OneTab is about memory: one click closes the tabs of a window and keeps them as a group on its list page. Session Buddy leaves your tabs open and saves windows as collections, which it restores as they were, window positions and pinned tabs included.',
      ],
      [
        'History and crash recovery',
        'Session Buddy keeps a timeline of past sessions on its own and brings windows back after a crash or restart; that is what it is best at. OneTab keeps one list that survives a restart, with a weekly backup in the same browser profile, but no history of past sessions.',
      ],
      [
        'Organizing what you keep',
        'OneTab 2 has folders, stars, notes and tasks on its list. Session Buddy has named collections and strong search across open tabs, collections and history, but no notes yet.',
      ],
      [
        'Keeping the data safe',
        'Both keep everything in the browser, without an account, and removing the extension removes the data: export now and then. OneTab now sells end-to-end encrypted sync for US$39.99 a year; Session Buddy has backup files, with cloud storage planned.',
      ],
    ],
    pick: [
      [
        'You open dozens of tabs and want to clear them in one click.',
        'You want notes and tasks on saved groups.',
        'You also use Firefox or Safari.',
      ],
      [
        'You want every session recorded, with crash recovery.',
        'You restore whole windows exactly as they were.',
        'You move lots of links in and out in many formats.',
      ],
    ],
    third: [
      'Saved tabs stay on every new tab, in groups you name, instead of a list or a timeline.',
      'Save a whole window as one group and close it, then open it again as a window or a tab group.',
      'Notes, to-dos and reminders next to the links, and Ctrl+K search over saved tabs, open tabs and bookmarks.',
      'Sync between computers when you sign in, or through a server you run yourself.',
    ],
  },
  {
    slug: 'toby-vs-workona',
    names: ['Toby', 'Workona'],
    slugs: ['toby', 'workona'],
    title: 'Toby vs Workona: which tab manager to pick',
    description:
      'Toby vs Workona compared: a board of saved tabs, or project workspaces that save themselves. Accounts, free limits, prices and a free third option.',
    crumb: 'Toby vs Workona',
    checked: 'November 2026',
    published: '2026-11-02',
    intro:
      'Toby and Workona both keep your tabs in the cloud and both have team plans, but they think about tabs differently: Toby saves links to a board, Workona manages the tabs you have open, project by project.',
    short:
      'Toby is a simple board of saved tabs on the new tab page; Workona manages the open tabs of each project and saves them for you. Both need an account and limit their free plans. If you want a board like Toby’s without an account or limits, with notes, to-dos and reminders, TabCabin fits best.',
    rows: [
      [
        'What it is',
        'A board of saved tabs',
        'Workspaces for projects',
        'Boards of saved tabs, notes and to-dos',
      ],
      ['Saved tabs on the new tab page', true, 'Separate add-on', true],
      ['Switches your open tabs per project', false, true, false],
      ['Saves open tabs by itself', false, 'Hourly snapshots', false],
      [
        'Notes and to-dos',
        'Notes with checklists',
        'Notes, tasks with due dates',
        'Notes, to-dos and reminders',
      ],
      ['Works without an account', false, false, true],
      [
        'Sync between computers',
        'Included, with an account',
        'Included, with an account',
        'Sign in, or your own server',
      ],
      [
        'Sharing',
        'View-only links, team spaces',
        'Shared spaces, edited together',
        'Read-only link, when signed in',
      ],
      [
        'Price',
        'Free up to 60 tabs per workspace, paid from $4.50/month',
        'Free up to 5 spaces, Pro from $7/month',
        'Free app, free self-hosting',
      ],
      ['Browsers', 'Chrome, Edge, Firefox', 'Chrome, Edge, Firefox', 'Chrome, Edge, Brave'],
      ['Open source', false, false, 'MIT'],
    ],
    differences: [
      [
        'Saved links or live workspaces',
        'Toby is a board of saved tabs: you save a window into a collection and open it again when you need it. Workona manages the tabs you have open: each project is a space, switching spaces swaps your tabs, and it saves them as you go, with hourly snapshots to go back to.',
      ],
      [
        'Notes, tasks and teams',
        'Both have notes and team plans. Toby adds checklists, view-only share links and team spaces. Workona adds tasks with due dates, spaces a team edits together and links to apps like Google Drive.',
      ],
      [
        'Free plans and price',
        'Toby’s free plan stops saving new tabs at 60 per workspace; paid plans cost $6 a month, or $4.50 a month billed yearly. Workona’s free plan has 5 spaces, and Pro starts at $7 a month.',
      ],
      [
        'Getting started',
        'Toby is quicker to pick up: one board on the new tab page. Workona does more and asks for more setup, and its new tab page is a separate add-on.',
      ],
    ],
    pick: [
      [
        'You want a simple board of saved tabs on every new tab.',
        'Your team shares collections of links.',
        'You want phone apps to look through your saved tabs.',
      ],
      [
        'You juggle projects and want the open tabs of each one saved and brought back for you.',
        'Your team works in shared spaces with tasks and cloud documents.',
      ],
    ],
    third: [
      'A board on every new tab, like Toby’s, with no account and no limit on saved tabs.',
      'Workspaces for projects, switched with Ctrl+O, and a whole window saved as one group in one click.',
      'Notes, to-dos and reminders next to the links, and Ctrl+K search over saved tabs, open tabs and bookmarks.',
      'Sync between computers when you sign in, or through a server you run yourself.',
    ],
  },
]

export const versusPath = (slug: string) => `/alternatives/${slug}/`
