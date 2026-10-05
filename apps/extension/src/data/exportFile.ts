import { type Bundle, collectBundle, createBackup, toBookmarksHtml, toCsv } from '@tabcabin/core'
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

/** Builds an export file of the given workspaces (all of them when `workspaceIds` is null). */
export async function buildExport(
  format: ExportFormat,
  workspaceIds: string[] | null,
  now = new Date(),
): Promise<{ filename: string; mime: string; content: string }> {
  const all = await loadAll()
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
