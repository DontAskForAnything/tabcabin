# Data model

```
Workspace ─┬─ Category ─┬─ Group ─┬─ Item (link | note | image | stack)
           │            │         │      ├─ Item (links inside a stack, `parentId` = stack)
           │            │         │      └─ Item (notes pinned to a link, `parentId` = link)
           │            │         └─ …
           │            └─ …
           └─ …
Reminder ── Item (at most one live reminder per item)
Activity (one per browser, for the week view)
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

The **Inbox** is a group outside every workspace for things saved without choosing a group. Its `id`
and `categoryId` are both `inbox` (no category has that id), so every browser that syncs creates the
same row instead of one each. The extension shows it first on every board while it holds items;
versions without the Inbox leave it out. A backup of everything stores it as a workspace called
"Inbox".

**Item** — `groupId`, `parentId`, `kind`, `position` and:

| Field          | Used by     | Meaning                                                                    |
| -------------- | ----------- | -------------------------------------------------------------------------- |
| `title`        | all         | page title, stack title, or snippet title                                  |
| `url`          | link, image | the page address (for images: the page it came from)                       |
| `favIconUrl`   | link        | icon captured from the tab when saved (fallback after the browser's cache) |
| `text`         | note, link  | note body, or the note written on a link itself (max 5 000 characters)     |
| `color`        | note, link  | one of `rose amber lime peach pink lilac sky teal sand`                    |
| `todo`, `done` | note, link  | a to-do and whether it is checked (on a link: its note is a to-do)         |
| `imageUrl`     | image       | the image address                                                          |
| `metaImageUrl` | link        | preview image                                                              |
| `emoji`        | all         | optional icon                                                              |
| `sourceUrl`    | note        | page a text selection was clipped from                                     |

A **stack** is an item of kind `stack` whose children are links with `parentId` set to the stack's id
(in the same group).

A link can hold **pinned notes**: notes (and to-dos) with `parentId` set to the link's id, in the same
group, ordered by `position`. They move, get deleted and come back from the bin with their link, and
a link inside a stack keeps them. The note written on the link itself (`text`, from the link editor,
the save popover or an import) shows above them; editing, dragging or unpinning it first turns it
into a pinned note. Older versions do not show pinned notes, and a note whose link is gone
shows at the top level of its group.

**Reminder** — `itemId`, `dueAt` (next time it is due), `repeat` (`none | weekly | monthly`),
`weekdays` (0 = Monday … 6 = Sunday), `monthDay` (1–31; short months use their last day), `timeOfDay`
(minutes after midnight, local time) and `firedAt` (when the notification for the current `dueAt` was
shown). Marking a repeating reminder done moves `dueAt` to the next occurrence.

**Activity** — one row per browser; its `id` is made on the first count and kept in the `meta` row
`activity.device`. `days` maps a local day (`2026-10-18`) to `{ closed, saved, done }`: tabs with a
page that were closed (in TabCabin or in the browser), links the user saved (not imports, templates or
the starter board; undo takes a save back) and to-dos ticked off (unticking takes it back). Each
browser only writes its own row, so last-write-wins never loses a count; signed in, the week view adds
up the rows of every computer, otherwise it shows this browser's row. Days older than eight weeks are
dropped. Versions before this row skip it.

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
  "format": "tabcabin",
  "version": 1,
  "exportedAt": "2026-10-07T12:00:00.000Z",
  "workspaces": [],
  "categories": [],
  "groups": [],
  "items": [],
  "reminders": []
}
```

Backups made before the app was renamed say `"format": "tabhangar"` and import the same way.
Only live rows are exported. On import the file is validated with the same Zod schemas, every id is
replaced (so a file can be imported next to existing data, even twice) and the workspaces are added
at the end of the list.

## tabExtend import

TabCabin can import JSON exports from tabExtend (`{ categories, tabData }`, or the older plain
array of groups) into a new workspace:

| tabExtend                                                          | TabCabin                                       |
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
