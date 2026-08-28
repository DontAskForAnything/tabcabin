# Data model

```
Workspace ─┬─ Category ─┬─ Group ─┬─ Item (link | note | image | stack)
           │            │         │      └─ Item (links inside a stack, `parentId` = stack)
           │            │         └─ …
           │            └─ …
           └─ …
Reminder ── Item (at most one live reminder per item)
```

All entities share these fields:

| Field                    | Type             | Notes                                           |
| ------------------------ | ---------------- | ----------------------------------------------- |
| `id`                     | string           | UUID                                            |
| `createdAt`, `updatedAt` | epoch ms         | `updatedAt` decides last-write-wins during sync |
| `deletedAt`              | epoch ms \| null | soft delete (see [Bin](#bin))                   |

Ordered entities also have `position`, a [fractional index](https://observablehq.com/@dgreensp/implementing-fractional-indexing)
key: lists are sorted by it, and inserting between two rows creates a key between theirs.

## Entities

**Workspace** — `name`, `emoji`, `position`.

**Category** — `workspaceId`, `name`, `position`. Shown as tabs in the top bar; each can use the board
or collections view (stored per category in settings).

**Group** — `categoryId`, `title`, `emoji`, `position`, `collapsed`, `width` (custom column width in
pixels or `null`).

**Item** — `groupId`, `parentId`, `kind`, `position` and:

| Field          | Used by     | Meaning                                                                    |
| -------------- | ----------- | -------------------------------------------------------------------------- |
| `title`        | all         | page title, stack title, or snippet title                                  |
| `url`          | link, image | the page address (for images: the page it came from)                       |
| `favIconUrl`   | link        | icon captured from the tab when saved (fallback after the browser's cache) |
| `text`         | note, link  | note body, or a comment attached to a link (max 5 000 characters)          |
| `color`        | note, link  | one of `rose amber lime peach pink lilac sky teal sand`                    |
| `todo`, `done` | note        | a to-do and whether it is checked                                          |
| `imageUrl`     | image       | the image address                                                          |
| `metaImageUrl` | link        | preview image                                                              |
| `emoji`        | all         | optional icon                                                              |
| `sourceUrl`    | note        | page a text selection was clipped from                                     |

A **stack** is an item of kind `stack` whose children are links with `parentId` set to the stack's id
(in the same group).

**Reminder** — `itemId`, `dueAt` (next time it is due), `repeat` (`none | weekly | monthly`),
`weekdays` (0 = Monday … 6 = Sunday), `monthDay` (1–31; short months use their last day), `timeOfDay`
(minutes after midnight, local time) and `firedAt` (when the notification for the current `dueAt` was
shown). Marking a repeating reminder done moves `dueAt` to the next occurrence.

## Bin

Deleting never removes rows right away: the row and everything deleted with it get the **same**
`deletedAt` timestamp. The bin lists only top-level deletions (a deleted group, not each of its items),
restores everything that shares the timestamp, and keeps the newest 100 entries. Items whose group no
longer exists are restored into a group called "Restored items" in the current category. "Delete
forever" purges the rows (and reminders of purged items).

## Change sets and the outbox

Writes are expressed as change sets: `{ type: 'put', entity, row }` or `{ type: 'purge', entity, id }`.
Applying one also records `(entity, id)` in the `outbox` table; the sync engine will send those rows to
the server and clear them when acknowledged.

## Backup format

Exports (`Settings → Data → Export → JSON`) look like this:

```json
{
  "format": "tabhangar",
  "version": 1,
  "exportedAt": "2026-10-07T12:00:00.000Z",
  "workspaces": [],
  "categories": [],
  "groups": [],
  "items": [],
  "reminders": []
}
```

Only live rows are exported. On import the file is validated with the same Zod schemas, every id is
replaced (so a file can be imported next to existing data, even twice) and the workspaces are added
at the end of the list.

## tabExtend import

TabHangar can import JSON exports from tabExtend (`{ categories, tabData }`, or the older plain
array of groups) into a new workspace:

| tabExtend                                                          | TabHangar                                      |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| category (`tabIndex` order)                                        | category                                       |
| group (`categoryID`, `title`, `emoji`, `collapsed`, `customWidth`) | group (unknown categories go to the first one) |
| site (`url`, `favIcon`, `comment`, `commentColor`, `metaUrl`)      | link with its comment as `text`                |
| note / to-do (`note: true`, `todo`, `doneStatus`)                  | note                                           |
| text snippet (`type: 'textCopied'`)                                | note with `sourceUrl`                          |
| image (`type: 'image'`)                                            | image                                          |
| stack (`isStacked`, `stackedItems`)                                | stack with child links                         |
| `commentColor` palette index                                       | nearest of the nine note colors                |

Links with unusable addresses (for example `javascript:`) are skipped.
