<div align="center">

<img src="apps/extension/assets/logo.svg" width="72" height="72" alt="" />

# TabHangar

**A calm home for your tabs.** TabHangar replaces the new tab page with boards where you park
tabs, links, notes and to-dos — and keeps them on your machine (or, soon, on a server you host
yourself).

[![CI](https://github.com/DontAskForAnything/tabhangar/actions/workflows/ci.yml/badge.svg)](https://github.com/DontAskForAnything/tabhangar/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-5B4BE0)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-5B4BE0)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/board-dark.png" />
  <img src="docs/screenshots/board-light.png" alt="TabHangar board with groups of links, notes and to-dos next to the open tabs panel" />
</picture>

</div>

## Why

Tabs pile up because closing them feels like losing them. TabHangar gives every tab a place to
land: drag it into a group, add a note, set a reminder, close it. Everything is one new tab away,
searchable, and works offline. There is no account, no tracking and no subscription.

![Dragging a tab into a group, adding a to-do, searching and switching to the collections view](docs/screenshots/demo.gif)

▶ [Watch the 45-second demo video](apps/landing/public/demo.webm)

## Features

**Organize**

- **Board view** — categories as tabs, groups as columns with big emoji headers, resizable and collapsible
- **Collections view** — the same groups as wide panels of link cards, per category
- **Notes and to-dos** inside groups, nine colors, `- ` bullets, `/todo` and `/done` shortcuts, Enter + Enter for the next note
- **Stacks** — hold one link over another to combine them; open all at once
- **Workspaces** — separate boards for work, home and side projects; move groups and categories between them
- **Drag and drop everywhere** — items, groups, open tabs, whole Chrome tab groups; drop on a category tab to move there, on the trash to delete

**Capture**

- **Open tabs panel** — every window and native tab group; select several tabs and save them in one go, close duplicates
- **Right-click menu** — save the page, a link, a text selection (as a note) or an image to any group
- **Save popover** (`Ctrl+Shift+S`) — add a sticky note, pick the group, set a reminder, close the tab
- The toolbar icon shows how many times the current page is already saved

**Find and remember**

- **Search** (`⌘K` / `Ctrl+K`) across the workspace, all workspaces, open tabs and bookmarks; jump to any result on the board
- **Reminders** — one-time, weekly or monthly; desktop notifications, snooze, and a due count on the toolbar icon
- **Bin** — restore deleted groups and items, or delete them for good
- **Undo** for every change (`⌘Z` / `Ctrl+Z`)

**Make it yours**

- Light and dark themes, compact density, English and Polish
- Rebindable keyboard shortcuts and a cheat sheet on `?`
- **Import** TabHangar backups, **tabExtend JSON exports**, Chrome bookmark folders and your most visited sites
- **Export** a workspace or everything as JSON, a bookmarks file or CSV

<table>
  <tr>
    <td><img src="docs/screenshots/collections-light.png" alt="Collections view" /></td>
    <td><img src="docs/screenshots/search.png" alt="Search palette" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/reminders.png" alt="Reminders" /></td>
    <td><img src="docs/screenshots/popover.png" alt="Save popover on a web page" /></td>
  </tr>
</table>

## Sync between computers

Run the small sync server on your own machine or VPS (Docker, SQLite, automatic HTTPS with Caddy),
then sign in from **Settings → Account & sync** in every browser. Changes show up on your other
computers within seconds. See [docs/self-hosting.md](docs/self-hosting.md).

```bash
cp .env.example .env    # domain and first account
docker compose --profile caddy up -d
```

## Install

TabHangar is not in the Chrome Web Store yet.

**From a release** — download `tabhangar-<version>-chrome.zip` from
[Releases](https://github.com/DontAskForAnything/tabhangar/releases), unzip it, open
`chrome://extensions`, turn on **Developer mode** and choose **Load unpacked** → the unzipped folder.

**From source**

```bash
pnpm install
pnpm build:ext   # → apps/extension/.output/chrome-mv3
```

Then load `apps/extension/.output/chrome-mv3` with **Load unpacked**. Works in Chrome, Edge, Brave and
other Chromium browsers.

## Privacy

Your data lives in the browser's IndexedDB and never leaves it. TabHangar has no analytics, no
accounts and no servers of its own; the only things it loads from the web are the icons and images of
pages you saved. Permissions it asks for:

| Permission                                            | Why                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tabs`, `tabGroups`                                   | Show and save your open tabs and native tab groups                                            |
| `contextMenus`, `activeTab`, `scripting`              | Right-click saving and the save popover on the page you are looking at (only after you click) |
| `storage`, `unlimitedStorage`                         | Keep your boards locally                                                                      |
| `favicon`                                             | Show site icons from the browser's own cache                                                  |
| `alarms`                                              | Fire reminders on time                                                                        |
| `sidePanel`                                           | Open the board in the side panel                                                              |
| `bookmarks`, `topSites`, `notifications` _(optional)_ | Asked only when you use bookmark search/import, most visited sites or desktop notifications   |

The extension has **no host permissions**: it cannot read pages unless you invoke it on one.

## Keyboard shortcuts

| Action                          | Shortcut                       |
| ------------------------------- | ------------------------------ |
| Search                          | `⌘K` / `Ctrl+K`                |
| Switch workspace                | `⌘O` / `Ctrl+O`                |
| New group                       | `G`                            |
| Switch category                 | `1`–`9`                        |
| Undo                            | `⌘Z` / `Ctrl+Z`                |
| Open the bin                    | `⌘⇧⌫` / `Ctrl+Shift+Backspace` |
| Save the current page (popover) | `⌘⇧S` / `Ctrl+Shift+S`         |
| All shortcuts                   | `?`                            |

Most of them can be changed in **Settings → Shortcuts**.

## Development

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev:ext        # extension with hot reload (opens a browser)
pnpm test           # unit tests (Vitest)
pnpm e2e            # end-to-end tests: builds the extension and runs Playwright in Chromium
pnpm typecheck && pnpm lint && pnpm format:check
pnpm zip:ext        # store-ready zip in apps/extension/.output
```

The screenshots in this README are generated from demo data with
`pnpm --filter @tabhangar/extension screenshots`.

### Repository layout

```
apps/extension      Chrome extension (WXT, React): new tab, side panel, background, content scripts
apps/server         self-hosted sync server (Hono, SQLite, Drizzle) and its Docker image
packages/core       data model, ordering, reminders, import/export — no browser APIs, fully unit tested
packages/ui         design system: tokens, Tailwind theme, accessible components on Radix
docs/               architecture, data model, screenshots
```

Read more in [docs/architecture.md](docs/architecture.md) and [docs/data-model.md](docs/data-model.md).

### Tech stack

TypeScript · React 19 · Tailwind CSS 4 · Radix UI · Motion · dnd-kit · Dexie (IndexedDB) · Zod ·
WXT (Manifest V3) · Hono · SQLite (better-sqlite3) · Drizzle ORM · Docker · Caddy · Vitest · Playwright ·
axe-core

## Roadmap

- [x] Local-first Chrome extension (board, collections, panel, saving, search, reminders, bin, import/export)
- [x] Self-hosted sync server — Docker image with login and password, live sync between browsers
- [ ] Landing page and Chrome Web Store listing

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## License

[MIT](LICENSE)
