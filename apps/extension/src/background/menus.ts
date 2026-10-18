import { displayHost, INBOX_EMOJI, INBOX_ID, isSavableUrl } from '@tabcabin/core'
import { sortByPosition } from '@tabcabin/core'
import { db } from '@/db/db'
import { loadOverview, type WorkspaceOverview } from '@/db/overview'
import type { MessageKey } from '@/i18n/en'
import { translate } from '@/i18n/translate'
import { getSettings } from '@/settings/settings'
import { saveToGroup, type SaveTarget } from './saving'
import { showToast } from './toast'

type Action = 'save' | 'close' | 'link' | 'note' | 'image'

type Context = 'page' | 'link' | 'selection' | 'image'

const ROOTS: { action: Action; contexts: [Context, ...Context[]]; title: MessageKey }[] = [
  { action: 'save', contexts: ['page'], title: 'menu.savePage' },
  { action: 'close', contexts: ['page'], title: 'menu.closeAndSave' },
  { action: 'link', contexts: ['link'], title: 'menu.saveLink' },
  { action: 'note', contexts: ['selection'], title: 'menu.saveSelection' },
  { action: 'image', contexts: ['image'], title: 'menu.saveImage' },
]

// Chrome puts two entries for the same right-click under the extension's full name, which is the
// long store title, so the page entries get a short parent of their own.
const PAGE_PARENT = 'root|page'

const create = (props: Browser.contextMenus.CreateProperties) =>
  new Promise<void>((resolve) => {
    browser.contextMenus.create(props, () => {
      void browser.runtime.lastError
      resolve()
    })
  })

/** Builds the right-click menu from the active workspace. */
export async function rebuildMenus() {
  const [settings, overview] = await Promise.all([getSettings(), loadOverview()])
  const t = (key: MessageKey) => translate(settings.locale, key)
  const workspace: WorkspaceOverview | undefined =
    overview.find((ws) => ws.id === settings.activeWorkspaceId) ?? overview[0]
  await browser.contextMenus.removeAll()
  if (!workspace) return
  const groups = sortByPosition(
    (
      await db.groups
        .where('categoryId')
        .anyOf(workspace.categories.map((c) => c.id))
        .toArray()
    ).filter((g) => g.deletedAt === null),
  )

  await create({ id: PAGE_PARENT, title: 'TabCabin', contexts: ['page'] })
  for (const root of ROOTS) {
    const rootId = `root|${root.action}`
    await create({
      id: rootId,
      title: t(root.title),
      contexts: root.contexts,
      ...(root.contexts.includes('page') && { parentId: PAGE_PARENT }),
    })
    // The Inbox first: saving there needs no choice of group.
    await create({
      id: `${root.action}|g|${INBOX_ID}`,
      parentId: rootId,
      title: `${INBOX_EMOJI} ${t('inbox.title')}`,
      contexts: root.contexts,
    })
    await create({
      id: `${root.action}|separator`,
      parentId: rootId,
      type: 'separator',
      contexts: root.contexts,
    })
    const single = workspace.categories.length === 1
    for (const category of workspace.categories) {
      const parentId = single ? rootId : `${root.action}|cat|${category.id}`
      if (!single)
        await create({
          id: parentId,
          parentId: rootId,
          title: category.name,
          contexts: root.contexts,
        })
      for (const group of groups.filter((g) => g.categoryId === category.id)) {
        await create({
          id: `${root.action}|g|${group.id}`,
          parentId,
          title: `${group.emoji} ${group.title || translate(settings.locale, 'group.untitled')}`,
          contexts: root.contexts,
        })
      }
      await create({
        id: `${root.action}|n|${category.id}`,
        parentId,
        title: t('menu.newGroup'),
        contexts: root.contexts,
      })
    }
  }
}

function parse(
  menuItemId: string | number,
): { action: Action; target: 'g' | 'n'; id: string } | null {
  const [action, target, id] = String(menuItemId).split('|')
  if (!action || !id || (target !== 'g' && target !== 'n')) return null
  return { action: action as Action, target, id }
}

/** Handles a click on one of our menu entries. Exported for tests. */
export async function handleMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
) {
  const parsed = parse(info.menuItemId)
  if (!parsed || !tab?.id) return
  const settings = await getSettings()
  const t = (key: MessageKey, params?: Record<string, string>) =>
    translate(settings.locale, key, params)
  const pageUrl = tab.url ?? info.pageUrl ?? ''
  const pageTitle = tab.title ?? displayHost(pageUrl)
  const target: SaveTarget =
    parsed.target === 'g'
      ? { groupId: parsed.id }
      : { newGroupIn: parsed.id, title: displayHost(pageUrl) || pageTitle }

  try {
    let saved: Awaited<ReturnType<typeof saveToGroup>>
    let message: MessageKey = 'toast.saved'
    if (parsed.action === 'note' && info.selectionText) {
      saved = await saveToGroup(target, {
        kind: 'note',
        text: info.selectionText,
        sourceUrl: pageUrl,
        title: pageTitle,
      })
      message = 'toast.noteSaved'
    } else if (parsed.action === 'image' && info.srcUrl) {
      saved = await saveToGroup(target, {
        kind: 'image',
        imageUrl: info.srcUrl,
        title: pageTitle,
        pageUrl,
      })
      message = 'toast.imageSaved'
    } else if (parsed.action === 'link' && info.linkUrl) {
      saved = await saveToGroup(target, {
        kind: 'link',
        url: info.linkUrl,
        title: info.selectionText || displayHost(info.linkUrl),
        favIconUrl: null,
      })
    } else {
      if (!isSavableUrl(pageUrl)) return
      saved = await saveToGroup(target, {
        kind: 'link',
        url: pageUrl,
        title: pageTitle,
        favIconUrl: tab.favIconUrl ?? null,
      })
    }

    if (parsed.action === 'close') {
      await closeOrReplace(tab)
      return
    }
    await showToast(tab.id, {
      title: t(message, { group: saved.groupTitle }),
      description: saved.alsoIn ? t('duplicate.alsoIn', { place: saved.alsoIn }) : undefined,
      tone: 'success',
      undo: saved.undo,
      undoLabel: t('common.undo'),
    })
  } catch (error) {
    console.error(error)
    await showToast(tab.id, { title: t('toast.failed'), tone: 'error' })
  }
}

/** Closes the tab, or turns it into a new tab page when it is the last one in its window. */
async function closeOrReplace(tab: Browser.tabs.Tab) {
  if (tab.id === undefined) return
  const siblings = await browser.tabs.query({ windowId: tab.windowId })
  if (siblings.length <= 1) await browser.tabs.update(tab.id, { url: 'chrome://newtab/' })
  else await browser.tabs.remove(tab.id)
}
