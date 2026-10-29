# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.4.1] — 2026-10-29

Type /todo anywhere in a note. Everything from 1.4.0 is in here too; the sync server from 1.3.2 is
enough.

### Changed

- `/todo` and the other note commands (`/done`, `/note`, `/undone`) work anywhere in a note: at
  the start, in the middle or at the end

## [1.4.0] — 2026-10-28

Done to-dos cross out and fold away under their group, a note can sit right on a link, a group can
open in this window, and now and then a tip in the corner. A template picked on the website opens
right after installing. The sync server from 1.3.2 is enough for this version.

### Added

- A template picked on the website opens right after installing TabCabin, without going back to
  its page; the store link opens in a new tab and the welcome skips asking how to start
- Website: the film has its own page with its scenes as chapters, so search engines can show it
- Website: TabCabin compared with Session Buddy, with the steps for moving saved sessions over
- Website: a free OneTab to bookmarks converter (also Toby exports and lists of links), working in
  the page without uploading anything
- Removing TabCabin opens a short goodbye page: where the boards are now and how to get them back,
  and one optional click on why
- Website: a guide to changing the new tab page in Chrome (online on 3 November)
- Settings → General → Open a group in: a group's open button puts its links in a new window or,
  if you like, in a tab group in this window
- Ticking off a to-do crosses it out with a small burst, then it flies into “N done” under its
  group, so the list keeps only what is left; open it to tick one back on or delete the done ones
- Now and then (at most every two days) a card in the corner shows one thing TabCabin can do, with
  the keys of this computer and a button to try it; Settings → General turns the tips off
- A note or to-do dropped on a link is pinned to it, and a link tile in the collections view has an
  “Add a note” button to write one right on the tile; a pinned to-do keeps its checkbox

### Fixed

- Collections view: a link's buttons no longer cover its title; the title fades out under them
- Website: the page-not-found scene fills the whole screen, and on wide screens the signpost no
  longer covers the heading
- Website: the arrow on the 404 page's Features sign matches the other signs
- Website: a click anywhere on the 404 page's Features sign opens the page; the lantern's glow
  covered most of it

## [1.3.2] — 2026-10-18

Templates for one job, a safe way to sign out of someone else's computer, a week that adds up across
your computers, and a short form to say what could be better. Update the sync server before the
extension: it needs to know the week's counts and the feedback form.

### Added

- Templates for one job: Job hunt, Thesis, Trip, Moving house, Gift list and Weekly reset, in English
  and Polish, under New workspace
- Every template starts its groups with a tip or a short checklist instead of leaving them empty
- Website: a page for every template under /templates/, with the whole board and a short guide. With
  TabCabin installed, "Add to TabCabin" adds the board in one click and opens it
- Chrome Web Store: the name, summary and description in German, Spanish, French, Portuguese
  (Brazil) and Japanese; the app itself stays in English and Polish
- Website: search engines learn that the Chrome Web Store listing and the code belong to the site
- Website: guides under /guides/, starting with how to save all your open tabs in Chrome. Each guide
  goes online on its own day, and the site rebuilds itself on those mornings
- Website: a guide to exporting your tabs from OneTab and moving them to TabCabin (online on 20
  October)
- Website: a guide to syncing tabs between computers without a Google account (online on 27
  October)
- Signing out asks whose computer it is. On your own the boards stay; on someone else's or a shared
  one, TabCabin sends the last changes to your account, removes everything from that browser and
  starts over with the welcome
- After two weeks of use, TabCabin asks once how it's working: rate it in the Chrome Web Store or
  write what to improve. "Not now" asks once more a month later. The form is also under More → Send
  feedback; only the version and language go with the message, nothing from your boards
- Server: `FEEDBACK_WEBHOOK_URL` passes the feedback form on to a Discord channel, with a daily limit
  per network

### Changed

- This week: signed in, every computer shows the same numbers, added up from all your computers
- This week: tabs you close in Chrome itself count as closed tabs too, not only the ones TabCabin
  closes
- Website: shorter page titles and descriptions, so search results show them whole
- Website: template pages have plain titles, such as "Job search tracker template for your new tab"
- Website: the film's poster is a WebP of 50 KB instead of a 180 KB JPEG, cached by browsers for good

### Fixed

- The starter board's search tip names the keys of your computer: Ctrl+K on Windows and Linux, ⌘K
  on a Mac
- Website: the privacy page had no space before "project repository"
- Website: screen readers heard "Tobycompared with TabCabin" in the comparison tables
- Deleting all data while signed in also ends the session on the server
- This week: imports, templates and links in the bin no longer count as saved links, moving,
  editing or deleting a finished to-do no longer counts it again, and undo takes a save back

## [1.3.1] — 2026-10-14

TabCabin in the Chrome Web Store, with a name that says what it does.

### Added

- TabCabin is in the Chrome Web Store; the README links the listing
- Website: search engines get the site's name, TabCabin, and its logo, to show in place of the bare
  address

### Changed

- The extension's name says what it does: TabCabin – Tab Manager, Boards & Notes (Polish: TabCabin –
  menedżer kart, tablice i notatki). The right-click menu still says TabCabin

### Fixed

- Website: the film's upload date in the search data now has a time and a time zone, as search
  engines expect
- Website: the TabCabin logo next to the site in search results (a PNG and an `.ico` favicon,
  since search engines skip SVG), plus icons for phone home screens

## [1.3.0] — 2026-10-14

A welcome for newcomers, an Inbox, shared groups and a quiet look at the week.

### Added

- A welcome for first-time users: what TabCabin does, then a start with the starter board, an
  empty board or a file from another tab manager, and the ways to fill the boards (with signing in
  when the build can sync)
- Templates: Work, Home, Study and Side project workspaces with their groups ready to fill, offered
  in the welcome and when creating a workspace
- Inbox: save a page without choosing a group (`Alt+Shift+S`, `Control+Shift+S` on a Mac, the
  right-click menu or the save popover). It shows first on every board until you drag each item
  where it belongs, can be searched, and a backup of everything keeps it
- Save a whole window as one group and close it (open tabs panel → Save all tabs), and open any
  group as a window again with one click on its header; undo brings the window back
- Saving a link that another group already has says where it is, with "Show" to go there
  (Settings → General turns it off)
- Links that no longer load get a small mark: turn on link checks in Settings → General and
  TabCabin asks each saved page about once a week whether it still loads (it needs access to the
  saved sites for that, which it gives back when the checks are turned off)
- Search does more: groups show up by name and Enter opens all their links, `→` moves an open
  tab or a saved item to a group, and what you typed can be added to a group (the Inbox first) as
  a note or a link
- This week: a quiet line in the tabs panel ("12 tabs closed this week") and a look back at the
  last seven days from the menu, with tabs closed, links saved and to-dos done; no streaks or
  badges, and Settings → Appearance hides the line
- Share a group with a read-only link (signed in, from the group menu): the sync server shows the
  group as it is now at `/s/<id>`, without scripts and out of search engines, until you stop
  sharing it
- Settings: "TabCabin" next to the version opens the website (`WXT_SITE_URL` when building; the
  Build workflow fills it from `SITE_URL`, other builds open the project on GitHub)
- Sign-in: an eye in each password field shows what you typed
- Website: "Coming soon to Chrome" in place of the download buttons until `EXTENSION_URL` is set,
  and GitHub links only once `REPO_URL` is set (both build variables, like `SITE_URL`)
- Website: a Dockerfile that serves the site with Caddy, for Coolify and other Docker hosts
- Website: a comparison with tabExtend, with a guide for moving over
- Website: optional visit counts with Umami (`UMAMI_SCRIPT_URL`, `UMAMI_WEBSITE_ID`), without
  cookies and not for browsers that send Do Not Track; the privacy page then says what is counted
- Self-hosting guide: running the sync server on Coolify
- A "Chrome Web Store" workflow: started by hand, it builds the extension with your addresses,
  uploads it to the store and sends it for review (setup in `docs/chrome-web-store`)

### Changed

- Website: the comparisons with OneTab, Toby and Workona mention the Inbox, saving a whole window
  and read-only links
- Sync works between different versions: fields and kinds of data added in later versions are
  kept or skipped instead of being dropped or stopping sync, and the server stores the rest of a
  batch when it cannot take one change
- A new workspace asks for its name and icon first, from the workspace menu and from the
  workspaces dialog, then opens
- Creating an account asks for the password twice, so a typo can't lock you out
- The top bar no longer shows the sync status once you are signed in; "Sign in" still shows while
  signed out, and the status lives in Settings → Account & sync
- Settings keep the section title and the close button in view while a long tab scrolls
- Settings in Polish: the account tab is called "Konto", so it fits on one line

### Fixed

- Typing a note in the save popover on a page with its own keyboard shortcuts (for example
  GitHub) no longer triggers those shortcuts
- The open tabs panel no longer shows "0 tabs" for a moment when it is pinned or peeks from the
  icons
- White site icons (GitHub's when the system is dark) sit on a dark tile instead of vanishing on
  white, and empty icons fall back to the letter tile
- Website: the comparison pages have a space again after "See also:"
- Website: links, canonical addresses and the sitemap use the same addresses (with a trailing
  slash), so search engines no longer meet a redirect behind every link

## [1.2.0] — 2026-10-09

A new name and a new look, more imports and smoother saving from pages.

### Renamed to TabCabin, new look

TabHangar is now **TabCabin — a calm cabin for your tabs**: a cabin logo, a black, white, pine and
cream palette, Bricolage Grotesque for the wordmark and headings, and calmer words throughout the
extension, the website and the docs. A brand guide lives in `docs/brand.md`.

Nothing to do when updating — existing data moves over by itself:

- The extension copies boards, settings, pending sync changes and the signed-in account from the old
  `tabhangar` database into `tabcabin` the first time it starts, then removes the old one
- Backups now say `format: "tabcabin"`; backups made under the old name still import
- The sync server renames an existing `tabhangar.db` to `tabcabin.db` on start and reports itself as
  `tabcabin` (the extension accepts both)
- Docker: the Compose service, image and volume are now called `tabcabin` and the admin command is
  `tabcabin` (for example `docker compose exec tabcabin tabcabin list-users`). If you ran the server
  before, see "Upgrading from TabHangar" in `docs/self-hosting.md` to keep your volume
- A manual **Build** workflow builds the extension and the website with your own addresses from
  repository variables (`WXT_SYNC_SERVER`, `SITE_URL`)

### New website look

- The home page opens on a forest valley with a small cabin; in the dark theme it is night, with
  stars, a lit window and fireflies, and switching the theme plays a short sunset
- Contour lines behind the self-hosting section, an etched forest above the footer and a faint
  paper grain over the whole site
- A new 404 page: a signpost made of browser tabs that link back to the site
- The background grid, glows, shimmering headline and cursor spotlights are gone
- The top bar is clear over the page and gets its background once you scroll; it now stays at the
  top on long pages
- "See it in under a minute" plays the film (muted until you turn the sound on) instead of the
  screen recording, and the screenshots next to the features sit in a Chrome window that follows
  the page shown
- The wording on the website is clearer about sync: it works as soon as you sign in, and running
  your own server is an option
- The footer links every comparison and every "moving from" guide
- The film is set in the forest valley from the website: morning at the start, the sun sets
  during the dark-theme scene, and it ends at night by the cabin. Sound effects are cut to the
  picture (tabs landing, the logo, scene changes, sync, the end card), with a quiet wind and fire

### Added

- Self-hosted sync server: accounts with scrypt passwords and sessions, login rate limiting,
  push/pull sync with last-write-wins per row, live updates over server-sent events, admin CLI,
  online backups
- Account & sync settings in the extension, first-sync choice (keep both or use the server's
  data), background sync with live updates and an alarm fallback
- Docker image (amd64 and arm64), Compose file with optional Caddy for HTTPS, backup script and a
  self-hosting guide
- Sign-in page: continue with Google or use a username and password; a Sign in button and a live
  sync status in the top bar. Syncing always runs on its own
- Server: sign in with Google (OAuth with PKCE), invitations by address or domain, a daily limit on
  new accounts per network, an optional account cap and a storage limit per account
- Import from Toby (single collections or whole organizations), bookmark HTML files and plain link
  lists such as OneTab exports
- Website (Astro): animated home page, self-hosting and comparison pages, privacy policy,
  structured data and sitemap, with guides for hosting it on Caddy, GitHub Pages or any static host
- A screen-recorded demo and a 52-second promo film with an original soundtrack, both generated by
  scripts from demo data; film stills in `docs/promo`
- `third-party-licenses.txt` in the extension and on the website, linked from Settings and the footer

### Changed

- The sync server is part of the build instead of a setting; self-hosters set `WXT_SYNC_SERVER`
- The language follows the browser on first start
- Smaller modules and components throughout (one feature per folder, one job per file)
- Removed unused code and dependencies; `pnpm audit` reports no known vulnerabilities

### Fixed

- The server no longer refuses to start when Docker Compose passes removed settings as empty values
- Clickable elements show the pointer cursor
- The save popover and in-page toasts stay above every element of the page
- The icon-only tabs panel widens in place on hover
- Toasts follow the light and dark theme

## [0.1.0] — 2026-08-29

First release: a local-first Chrome extension.

### Added

- New tab board: categories, groups with emoji headers, links, notes, to-dos, images and stacks;
  resizable and collapsible groups; inline note editing with a formatting toolbar
- Collections view per category
- Drag and drop for items, groups, open tabs and Chrome tab groups, with combining into stacks,
  moving between categories and a trash drop zone
- Open tabs panel: windows, native tab groups, multi-select, save to any group, close duplicates,
  pinned or icon-only mode
- Workspaces with a keyboard-driven picker; moving categories and groups between workspaces
- Search palette across the workspace, all workspaces, open tabs and bookmarks
- Saving from any page: right-click menu (page, link, selection, image), in-page save popover with
  notes and reminders, saved-count badge
- Reminders: one-time, weekly and monthly, desktop notifications, snooze, due badge
- Bin with restore, delete forever and empty bin; undo for every change
- Settings: language (English, Polish), theme, density, link behavior, rebindable shortcuts,
  storage overview, delete all data
- Export as JSON, bookmarks HTML or CSV; import TabHangar backups, tabExtend JSON exports, Chrome
  bookmark folders and most visited sites
- Keyboard shortcut sheet (`?`), accessibility audit in the test suite, reduced-motion support

[Unreleased]: https://github.com/DontAskForAnything/tabcabin/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/DontAskForAnything/tabcabin/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/DontAskForAnything/tabcabin/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/DontAskForAnything/tabcabin/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/DontAskForAnything/tabcabin/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/DontAskForAnything/tabcabin/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/DontAskForAnything/tabcabin/compare/v0.1.0...v1.2.0
[0.1.0]: https://github.com/DontAskForAnything/tabcabin/releases/tag/v0.1.0
