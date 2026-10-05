import { type Bundle, bundleStats, importTabExtend, isBackup, isBookmarksHtml, isOneTabExport, isTabExtendExport, isTobyExport, isUrlList, type Outline, outlineLinkCount, outlineToBundle, parseBackup, parseBookmarksHtml, parseToby, parseUrlList, positionsAtEnd, puts, remapBundle } from '@tabcabin/core'
import { applyChanges } from '@/db/apply'
import { getWorkspaces } from '@/db/repo'

export class ImportError extends Error {}

export interface ImportResult {
  workspaceId: string
  workspaces: number
  groups: number
  items: number
}

/** Names for what an import creates, in the user's language. */
export interface ImportNames {
  tabExtend: string
  toby: string
  bookmarks: string
  oneTab: string
  links: string
  category: string
  group: string
}

/**
 * Imports a file into new workspaces: a TabHangar backup, a tabExtend or Toby JSON export, a
 * bookmarks HTML file (browsers, Toby, Raindrop…) or a plain list of links (OneTab, Toby TXT).
 */
export async function importFile(
  text: string,
  names: ImportNames,
  now = Date.now(),
): Promise<ImportResult> {
  const [position] = positionsAtEnd(await getWorkspaces(), 1)
  const fromOutline = (outline: Outline, workspaceName: string, workspaceEmoji: string) => {
    if (outlineLinkCount(outline) === 0) throw new ImportError('no links found')
    return outlineToBundle(outline, {
      now,
      position: position!,
      workspaceName,
      workspaceEmoji,
      categoryName: names.category,
      groupName: names.group,
    })
  }

  let bundle: Bundle
  const trimmed = text.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let value: unknown
    try {
      value = JSON.parse(text)
    } catch {
      throw new ImportError('invalid JSON')
    }
    if (isBackup(value)) {
      let parsed: Bundle
      try {
        parsed = parseBackup(value)
      } catch (error) {
        throw new ImportError((error as Error).message)
      }
      const positions = positionsAtEnd(await getWorkspaces(), parsed.workspaces.length)
      bundle = remapBundle(parsed, { now, workspacePositions: positions })
    } else if (isTabExtendExport(value)) {
      bundle = importTabExtend(value, {
        now,
        position: position!,
        workspaceName: names.tabExtend,
        categoryName: names.category,
      })
    } else if (isTobyExport(value)) {
      bundle = fromOutline(parseToby(value), names.toby, '📚')
    } else {
      throw new ImportError('unknown format')
    }
  } else if (isBookmarksHtml(text)) {
    bundle = fromOutline(parseBookmarksHtml(text), names.bookmarks, '🔖')
  } else if (isUrlList(text)) {
    const name = isOneTabExport(text) ? names.oneTab : names.links
    bundle = fromOutline(parseUrlList(text), name, '📥')
  } else {
    throw new ImportError('unknown format')
  }
  if (bundle.workspaces.length === 0) throw new ImportError('no workspaces')
  await applyChanges([
    ...puts('workspace', bundle.workspaces),
    ...puts('category', bundle.categories),
    ...puts('group', bundle.groups),
    ...puts('item', bundle.items),
    ...puts('reminder', bundle.reminders),
  ])
  const stats = bundleStats(bundle)
  return {
    workspaceId: bundle.workspaces[0]!.id,
    workspaces: stats.workspaces,
    groups: stats.groups,
    items: stats.items,
  }
}
