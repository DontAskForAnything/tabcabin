# Architecture

TabCabin is a pnpm monorepo with five TypeScript packages:

```
packages/core      pure domain logic — runs anywhere (extension, server, tests)
packages/ui        design system — tokens, Tailwind theme and accessible React components
apps/extension     the Chrome extension (WXT, Manifest V3, React)
apps/server        sync server: Hono, SQLite (Drizzle), password and Google sign-in
apps/landing       the website (Astro)
```

Code is organized by feature: a folder per feature (`app/board/group`, `app/signin`,
`db/repo`, `sync`, …), one component or one job per file, with hooks (`use…`) for state and side
effects and plain functions for logic that can be tested on its own.

## packages/core

Everything that can be written without browser APIs lives here and is covered by unit tests:

- **Schema** (`schema.ts`) — Zod schemas for workspaces, categories, groups, items and reminders. The
  same schemas validate backups and sync payloads on the server.
- **Ordering** (`position.ts`) — fractional index keys (`fractional-indexing`). Moving an item writes
  one row instead of renumbering a list, which keeps change sets small and sync conflicts rare.
- **Operations** (`ops.ts`) — moving, combining into stacks, unstacking, duplicating, sorting and soft
  deletion return **change sets** (`put`/`purge` lists) instead of writing anything themselves.
- **Reminders** (`reminders.ts`) — next occurrence of weekly and monthly rules, snooze presets, due
  checks.
- **Transfer** (`transfer/`) — the backup format, bookmarks HTML and CSV exporters, and importers for
  tabExtend and Toby exports, bookmark files and link lists (parsed into a shared outline first).
- **Text helpers** — URL normalization (for "already saved" checks and duplicate detection) and note
  shortcuts (`- ` → `•`, `/todo`, `/done`).

## packages/ui

Design tokens are CSS custom properties (`styles/tokens.css`) switched by a `.dark` class, exposed to
Tailwind CSS 4 through `@theme`. Components (Button, Modal, Menu, Popover, Tooltip, Switch, toasts,
emoji picker, favicon tiles…) use Radix primitives for behavior and focus management and are styled
with Tailwind. The package has no i18n of its own: the app passes translated labels through
`UiTextProvider`.

`styles/base.css` contains everything except web fonts, so content scripts can inject the theme into
a shadow root without loading fonts into visited pages.

## apps/extension

Built with [WXT](https://wxt.dev). Entry points in `src/entrypoints`:

| Entry             | Purpose                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `newtab`          | The main app (board, collections, panel, dialogs) replacing the new tab page             |
| `sidepanel`       | The same app in compact layout for Chrome's side panel                                   |
| `background`      | Service worker: context menus, toolbar badge, popover toggle, reminders, the sync engine |
| `signin`          | The sign-in page (Google or username and password)                                       |
| `popover.content` | Save popover, injected into the active tab on demand, rendered in a shadow root          |
| `toast.content`   | Small in-page toasts with Undo after saving from the context menu                        |

Content scripts are registered at runtime without `matches` and injected with `activeTab` +
`scripting`, so the extension needs **no host permissions**. The one exception is optional: link
checks (`background/linkChecks.ts`) ask for access to all sites while they are turned on.

### Data flow

```
UI action ──► db/repo (commit) ──► applyChanges ──► Dexie transaction ─┬─► IndexedDB tables
                 │                                                     └─► outbox (for sync)
                 └─ undo change set (rows as they were before)

IndexedDB ──► liveQuery (dexie-react-hooks) ──► React components   (every open page and the
                                                                    service worker stay in sync)
```

- **`db/db.ts`** — Dexie schema: one table per entity plus `settings`, `meta` and `outbox`.
- **`db/repo/`** — one module per entity (workspaces, categories, groups, items, bin, reminders).
  Every write goes through `commit()`, which snapshots the affected rows first and returns the inverse
  change set. Undo is therefore generic: re-apply the snapshot.
- **`db/apply.ts`** — writes a change set in one transaction and records each changed row in the
  `outbox`, which the sync engine pushes to the server.
- **`db/seed.ts`, `db/onboarding.ts`** — the first start creates a starter workspace and opens the
  welcome dialog (`app/onboarding/`). A `meta` row remembers that it was seen. Starting with an empty
  board or an import removes the starter workspace, but only while nothing in it has changed.
- Reads are live queries; there is no client-side cache to invalidate. New tab pages, the side panel
  and the service worker all observe the same database.

### Sync

The sync engine runs in the service worker (`sync/`): `push.ts` sends the outbox, `pull.ts` applies
the server's changes without queuing them again, `firstSync.ts` handles the first sign-in, and
`engine.ts` only schedules them (on every change, on a server-sent event, and once a minute). The
server keeps the newest version of each row (last write wins by the client's `updatedAt`).

Copies of the extension update at different times, so every version has to keep syncing with the
others and with the server:

- Rows travel with `syncSchemas` (core): known fields are checked, unknown ones are kept. An older
  copy that edits a row sends back the fields a newer version added.
- An older copy skips kinds of rows it does not know. The server rejects a change it cannot store
  on its own (`rejected` in the push response) and stores the rest of the batch, so one bad row
  never stops syncing.
- New fields are optional, and fields, values and API routes are never renamed or removed.
  `compat.test.ts` keeps rows from 1.2 valid. Update the server before releasing an extension
  that relies on it.

The server address is part of the build (`src/sync/server.ts`, or `WXT_SYNC_SERVER` in
`apps/extension/.env`). Signing in happens on its own page: Google through the server's OAuth flow
with PKCE (the extension receives a one-time code only it can redeem), or username and password.

### UI state

Server-like data comes from IndexedDB; ephemeral UI state (open dialog, note being edited, selection)
lives in small zustand stores (`state/`). Settings are rows in the `settings` table merged with
defaults, so they are live across pages too.

### Drag and drop

dnd-kit provides sensors, the drag overlay and auto-scroll. Target resolution is custom
(`app/dnd/logic.ts`, unit tested): the outer 30 % of an item means "insert before/after", holding the
middle for 450 ms means "combine into a stack", and an insert line is drawn instead of reflowing the
list, which keeps cross-group drags steady. Hovering a category tab for 550 ms switches category mid
drag. Keyboard users get the same moves through the item and group menus.

### Internationalization

A typed dictionary per language (`i18n/en.ts`, `i18n/pl.ts`). Polish uses `Intl.PluralRules` forms.
The `MessageKey` type makes a missing translation a compile error. Manifest strings use `_locales`.

### Accessibility

Radix handles focus traps, roving focus and ARIA for dialogs, menus and tabs. An automated axe audit
(`e2e/a11y.spec.ts`) checks the board, the collections view, every dialog and the settings tabs in
both themes for WCAG 2.1 AA issues. Hover-only actions also appear on keyboard focus, and animations
respect the system "reduce motion" setting.

## Testing

| Layer      | Tool                    | What                                                                                                                                      |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Domain     | Vitest                  | core operations, ordering, reminders, import/export                                                                                       |
| Data       | Vitest + fake-indexeddb | repo operations, undo, bin, seeding                                                                                                       |
| UI kit     | Vitest + jsdom          | component behavior                                                                                                                        |
| End to end | Playwright + Chromium   | the built extension loaded unpacked: boards, drag and drop, panel, saving, search, reminders, bin, settings, import/export, accessibility |

CI runs type checks, lint, formatting, unit tests, the production build and the full end-to-end suite on
every push.
