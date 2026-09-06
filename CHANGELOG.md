# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Self-hosted sync server: accounts with scrypt passwords and sessions, login rate limiting,
  push/pull sync with last-write-wins per row, live updates over server-sent events, admin CLI,
  online backups
- Account & sync settings in the extension, first-sync choice (keep both or use the server's
  data), background sync with live updates and an alarm fallback
- Docker image (amd64 and arm64), Compose file with optional Caddy for HTTPS, backup script and a
  self-hosting guide

### Fixed

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

[Unreleased]: https://github.com/DontAskForAnything/tabhangar/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DontAskForAnything/tabhangar/releases/tag/v0.1.0
