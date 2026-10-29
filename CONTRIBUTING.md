# Contributing to TabCabin

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Issues

- **Found a bug?** Open an issue with the **Bug** form: what you did, what happened, your TabCabin
  version (bottom left of Settings) and your browser.
- **Have an idea?** Use the **Idea** form and start with the problem it solves; the solution can
  come later.
- Look through the open issues first, someone may have asked already.
- Please don't post security problems in a public issue. Use **Report a vulnerability** on the
  Security tab instead.

## Before a bigger change

Open an issue (or comment on one) before you start on a new feature or a large change, so we can
agree on the approach first. Small fixes can go straight to a pull request.

## Getting started

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev:ext        # the extension with hot reload, in a new browser window
```

A build without a sync server works offline, which is all most changes need. To try sync, run the
server as described in [docs/self-hosting.md](docs/self-hosting.md#without-docker) and point the
extension at it in `apps/extension/.env` (see `.env.example`).

| Folder           | What it is                                                 |
| ---------------- | ---------------------------------------------------------- |
| `apps/extension` | The Chrome extension (WXT, React, Tailwind, Dexie)         |
| `apps/server`    | The sync server (Hono, SQLite)                             |
| `apps/landing`   | The website (Astro)                                        |
| `packages/core`  | Data, board operations and importers shared by all of them |
| `packages/ui`    | The design system                                          |

More in [docs/architecture.md](docs/architecture.md) and [docs/data-model.md](docs/data-model.md).

## Before you open a pull request

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm e2e
```

The first `pnpm e2e` needs the test browser:
`pnpm --filter @tabcabin/extension exec playwright install chromium`.

- One topic per pull request. Small ones get reviewed fastest.
- Add or update tests: unit tests sit next to the code (`*.test.ts`), end-to-end tests in
  `apps/extension/e2e/`.
- Every text in the app is in English and Polish (`apps/extension/src/i18n/en.ts` and `pl.ts`). If
  you don't speak Polish, copy the English text into `pl.ts` and say so in the pull request.
- Data that syncs must stay readable by older versions: new fields are optional, and fields, values
  and routes are never renamed or removed (`packages/core/src/compat.test.ts` checks this).
- Add a line for users under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat(panel): …`, `fix(sync): …`.

CI runs the same checks on every pull request. By contributing, you agree that your work is
released under the [MIT license](LICENSE).
