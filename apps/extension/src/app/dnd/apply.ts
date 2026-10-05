import { toast } from '@tabcabin/ui'
import { loadRow } from '@/db/apply'
import * as repo from '@/db/repo'
import type { Translate } from '@/i18n'
import type { Settings } from '@/settings/settings'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { BoardActions } from '../board/actions'
import { randomEmoji } from '../board/actions'
import { indexAmongRemaining } from './logic'
import type { DragSource, DropTarget } from './types'

export interface ApplyContext {
  t: Translate
  actions: BoardActions
  settings: Settings | undefined
  categoryId: string | undefined
}

/** Ids of the items currently rendered in a list, top to bottom. */
export function listOrder(groupId: string, parentId: string | null): string[] {
  const list = document.querySelector(`[data-list-id="${groupId}:${parentId ?? ''}"]`)
  if (!list) return []
  return [...list.querySelectorAll<HTMLElement>(':scope > [data-dnd-item]')].map(
    (el) => el.dataset.dndItem!,
  )
}

export function listRects(groupId: string, parentId: string | null): DOMRect[] {
  const list = document.querySelector(`[data-list-id="${groupId}:${parentId ?? ''}"]`)
  if (!list) return []
  return [...list.querySelectorAll<HTMLElement>(':scope > [data-dnd-item]')].map((el) =>
    el.getBoundingClientRect(),
  )
}

function groupOrder(): string[] {
  return [...document.querySelectorAll<HTMLElement>('[data-dnd-group]')].map(
    (el) => el.dataset.dndGroup!,
  )
}

async function closeTabs(tabIds: number[], settings: Settings | undefined) {
  if (settings && !settings.closeTabOnSave) return
  if (typeof browser === 'undefined' || !browser.tabs) return
  const current = await browser.tabs.getCurrent()
  const ids = tabIds.filter((id) => id !== current?.id)
  if (ids.length) await browser.tabs.remove(ids).catch(() => undefined)
}

async function firstGroupOf(categoryId: string): Promise<string> {
  const groups = await repo.getGroups(categoryId)
  if (groups[0]) return groups[0].id
  return (await repo.createGroup(categoryId, { emoji: randomEmoji() })).groupId
}

export async function applyDrop(source: DragSource, target: DropTarget, ctx: ApplyContext) {
  if (!target) return
  const { t, actions, settings } = ctx
  const moved = (result: repo.Result, count: number) =>
    offerUndo(result, { title: t('item.moved', { count }), undoLabel: t('common.undo') })

  if (source.kind === 'items') {
    const ids = source.ids
    switch (target.kind) {
      case 'insert': {
        const order = listOrder(target.groupId, target.parentId)
        const index = indexAmongRemaining(order, new Set(ids), target.index)
        const unchanged =
          target.groupId === source.groupId &&
          target.parentId === source.parentId &&
          order.filter((id) => !ids.includes(id)).length === order.length - ids.length &&
          indexAmongRemaining(order, new Set(ids), order.indexOf(ids[0]!)) === index
        if (unchanged) return
        const result = await repo.moveItemsTo(ids, {
          groupId: target.groupId,
          index,
          parentId: target.parentId,
        })
        if (target.groupId !== source.groupId) moved(result, ids.length)
        return
      }
      case 'combine':
        await actions.combine(ids, target.itemId)
        return
      case 'newGroup': {
        if (!ctx.categoryId) return
        const { groupId } = await repo.createGroup(ctx.categoryId, { emoji: randomEmoji() })
        await repo.moveItemsTo(ids, { groupId, index: 0 })
        useUi.getState().setFocusGroupTitle(groupId)
        return
      }
      case 'trash':
        await actions.deleteItems(ids)
        return
      case 'category': {
        const groupId = await firstGroupOf(target.categoryId)
        moved(await repo.moveItemsTo(ids, { groupId, index: 0 }), ids.length)
        return
      }
      default:
        return
    }
  }

  if (source.kind === 'group') {
    switch (target.kind) {
      case 'groupInsert': {
        const order = groupOrder()
        const index = indexAmongRemaining(order, new Set([source.groupId]), target.index)
        if (target.categoryId === source.categoryId && order.indexOf(source.groupId) === index)
          return
        await repo.moveGroup(source.groupId, { categoryId: target.categoryId, index })
        return
      }
      case 'category':
        if (target.categoryId === source.categoryId) return
        offerUndo(
          await repo.moveGroup(source.groupId, { categoryId: target.categoryId, index: 0 }),
          {
            title: t('group.moved'),
            undoLabel: t('common.undo'),
          },
        )
        return
      case 'trash': {
        const group = await repo
          .getGroups(source.categoryId)
          .then((gs) => gs.find((g) => g.id === source.groupId))
        if (group) await actions.deleteGroup(group)
        return
      }
      default:
        return
    }
  }

  // Tabs from the open-tabs panel: save as links, then close them.
  const links = source.tabs.map((tab) => ({
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
  }))
  let groupId: string | null = null
  let index = 0
  if (target.kind === 'insert') {
    groupId = target.groupId
    const order = listOrder(target.groupId, target.parentId)
    index = indexAmongRemaining(order, new Set(), target.index)
    if (target.parentId) {
      const { ids } = await repo.addLinks(groupId, links)
      await repo.moveItemsTo(ids, { groupId, index, parentId: target.parentId })
      groupId = null
    }
  } else if (target.kind === 'newGroup' && ctx.categoryId) {
    groupId = (await repo.createGroup(ctx.categoryId, { emoji: randomEmoji() })).groupId
    useUi.getState().setFocusGroupTitle(groupId)
  } else if (target.kind === 'category') {
    groupId = await firstGroupOf(target.categoryId)
  } else if (target.kind === 'combine') {
    const targetRow = await loadRow('item', target.itemId)
    if (targetRow) {
      const { ids } = await repo.addLinks(targetRow.groupId, links)
      await actions.combine(ids, target.itemId)
    }
  }
  if (groupId) await repo.addLinks(groupId, links, index)
  if (
    target.kind === 'insert' ||
    target.kind === 'newGroup' ||
    target.kind === 'category' ||
    target.kind === 'combine'
  ) {
    toast({ title: t('dnd.tabsSaved', { count: links.length }), tone: 'success' })
    await closeTabs(source.tabIds, settings)
  }
}
