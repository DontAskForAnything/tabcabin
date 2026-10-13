import {
  type Bundle,
  collectBundle,
  createBackup,
  INBOX_ID,
  makeCategory,
  makeWorkspace,
  positionAtEnd,
  toBookmarksHtml,
  toCsv,
} from '@tabcabin/core'
import { db } from '@/db/db'

export type ExportFormat = 'json' | 'html' | 'csv'

/** Lets spreadsheet apps detect UTF-8 in CSV files. */
const BOM = '\uFEFF'

async function loadAll(): Promise<Bundle> {
  const [workspaces, categories, groups, items, reminders] = await Promise.all([
    db.workspaces.toArray(),
    db.categories.toArray(),
    db.groups.toArray(),
    db.items.toArray(),
    db.reminders.toArray(),
  ])
  return { workspaces, categories, groups, items, reminders }
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'workspace'

/**
 * The Inbox as a workspace of its own (it belongs to none), so that exporting everything keeps
 * what is still waiting there. Importing the file brings it back as that workspace.
 */
function withInbox(all: Bundle, name: string): Bundle {
  const inbox = all.groups.find((group) => group.id === INBOX_ID && group.deletedAt === null)
  const waiting = all.items.some((item) => item.groupId === INBOX_ID && item.deletedAt === null)
  if (!inbox || !waiting) return all
  const clock = { now: inbox.updatedAt }
  const live = all.workspaces.filter((ws) => ws.deletedAt === null)
  const workspace = makeWorkspace(
    { name, emoji: inbox.emoji, position: positionAtEnd(live) },
    clock,
  )
  const category = makeCategory({ workspaceId: workspace.id, name, position: 'a0' }, clock)
  return {
    ...all,
    workspaces: [...all.workspaces, workspace],
    categories: [...all.categories, category],
    groups: all.groups.map((group) =>
      group.id === INBOX_ID ? { ...group, title: name, categoryId: category.id } : group,
    ),
  }
}

/**
 * Builds an export file of the given workspaces, or of everything (with the Inbox, named
 * `inboxName`) when `workspaceIds` is null.
 */
export async function buildExport(
  format: ExportFormat,
  workspaceIds: string[] | null,
  inboxName: string,
  now = new Date(),
): Promise<{ filename: string; mime: string; content: string }> {
  const stored = await loadAll()
  const all = workspaceIds ? stored : withInbox(stored, inboxName)
  const ids = workspaceIds ?? all.workspaces.map((ws) => ws.id)
  const bundle = collectBundle(all, ids)
  const date = now.toISOString().slice(0, 10)
  const name =
    workspaceIds && bundle.workspaces.length === 1
      ? `tabcabin-${slug(bundle.workspaces[0]!.name)}-${date}`
      : `tabcabin-${date}`
  if (format === 'json')
    return {
      filename: `${name}.json`,
      mime: 'application/json',
      content: `${JSON.stringify(createBackup(bundle, now), null, 2)}\n`,
    }
  if (format === 'html')
    return {
      filename: `${name}-bookmarks.html`,
      mime: 'text/html',
      content: toBookmarksHtml(bundle, now.getTime()),
    }
  return { filename: `${name}.csv`, mime: 'text/csv', content: `${BOM}${toCsv(bundle)}` }
}

export function downloadFile(file: { filename: string; mime: string; content: string }) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
