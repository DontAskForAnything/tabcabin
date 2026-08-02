# TabHangar

A calm home for your tabs. TabHangar replaces the new tab page with boards of groups where you park
tabs, links, notes and to-dos — and later syncs them through a server you host yourself.

> **Status:** early development. The first milestone is a fully local Chrome extension; a self-hosted
> sync server and a landing page follow.

## Planned features

- **Board view** — categories as tabs, groups as columns, big emoji headers, notes, to-dos and stacks of links
- **Collections view** — the same data laid out as rows of cards
- **Open tabs panel** — drag tabs from the current window into a group to save and close them
- **Save from any page** — right-click menu and an in-page popover with a sticky note
- **Search** with `⌘K`, reminders with system notifications, bin with restore, import/export
- **Self-hosted sync** — Docker image with login and password, data stays on your server
- Light and dark themes, English and Polish

## Tech stack

TypeScript · React · Tailwind CSS · Radix UI · dnd-kit · Dexie (IndexedDB) · WXT (Manifest V3) ·
Hono + SQLite (server) · Vitest · Playwright

## Development

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm test        # unit tests
pnpm typecheck
pnpm lint
```

## Repository layout

```
apps/        extension (WXT), server, landing
packages/    core (data model and domain logic), ui (design system)
```

## License

MIT
