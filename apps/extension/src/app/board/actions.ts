import {
  applyNoteShortcuts,
  displayHost,
  type Group,
  type Item,
  looksLikeImageUrl,
  looksLikeUrl,
  NOTE_MAX_LENGTH,
  type SortMode,
  withProtocol,
} from '@tabhangar/core'
import { toast } from '@tabhangar/ui'
import { useMemo } from 'react'
import type { BoardGroup, BoardItem } from '@/db/hooks'
import * as repo from '@/db/repo'
import { type Translate, useLocale, useT } from '@/i18n'
import { copyText, openAsTabGroup, openUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../useActive'

export { randomEmoji } from '@/lib/emoji'
import { randomEmoji } from '@/lib/emoji'

/** Text representation of a group for the clipboard. */
function groupAsText(group: BoardGroup, t: Translate): string {
  const lines = [`${group.emoji} ${group.title || t('group.untitled')}`, '']
  const line = (item: Item, indent = '') => {
    if (item.kind === 'note')
      lines.push(`${indent}${item.todo ? (item.done ? '[x] ' : '[ ] ') : ''}${item.text}`)
    else if (item.url) {
      lines.push(`${indent}${item.title || item.url}`)
      lines.push(`${indent}${item.url}`)
      if (item.text) lines.push(`${indent}  ${item.text}`)
    }
  }
  for (const item of group.items) {
    if (item.kind === 'stack') {
      lines.push(item.title || t('stack.title', { count: item.children.length }))
      item.children.forEach((child) => line(child, '  '))
    } else line(item)
  }
  return lines.join('\n')
}

export function useBoardActions(active: ActiveContext) {
  const t = useT()
  const locale = useLocale()
  const settings = active.settings
  const categoryId = active.category?.id

  return useMemo(() => {
    const undoable = (title: string) => (result: repo.Result) =>
      offerUndo(result, { title, undoLabel: t('common.undo') })

    return {
      async createGroup(index?: number) {
        if (!categoryId) return null
        const { groupId } = await repo.createGroup(categoryId, { emoji: randomEmoji(), index })
        useUi.getState().setFocusGroupTitle(groupId)
        return groupId
      },
      async deleteGroup(group: Group) {
        const result = await repo.deleteGroup(group.id)
        undoable(t('group.deleted', { name: group.title || t('group.untitled') }))(result)
      },
      async duplicateGroup(group: Group) {
        const result = await repo.duplicateGroup(group.id, t('group.copySuffix'))
        undoable(t('group.duplicated'))(result)
      },
      async sortGroup(group: Group, mode: SortMode) {
        undoable(t('group.sorted'))(await repo.sortGroup(group.id, mode, locale))
      },
      async moveGroupTo(group: Group, targetCategoryId: string) {
        undoable(t('group.moved'))(
          await repo.moveGroup(group.id, { categoryId: targetCategoryId, index: 999 }),
        )
      },
      async copyGroup(group: BoardGroup) {
        if (await copyText(groupAsText(group, t)))
          toast({ title: t('group.copied'), tone: 'success' })
      },
      async openGroup(group: BoardGroup, newWindow = false) {
        const urls = group.items.flatMap((item) =>
          item.kind === 'stack' ? item.children.map((c) => c.url) : [item.url],
        )
        await openAsTabGroup(
          urls.filter((u): u is string => !!u),
          { title: group.title, newWindow },
        )
      },
      async openStack(stack: BoardItem) {
        await openAsTabGroup(
          stack.children.map((c) => c.url).filter((u): u is string => !!u),
          { title: stack.title },
        )
      },

      /** Adds a link when the text looks like a URL, otherwise a note. Returns the new note id (if any). */
      async addFromText(groupId: string, raw: string, index?: number): Promise<string | null> {
        const text = raw.trim()
        if (!text) return null
        if (looksLikeUrl(text)) {
          const url = withProtocol(text)
          if (looksLikeImageUrl(text))
            await repo.addImage(groupId, { imageUrl: url, title: displayHost(url) }, index)
          else await repo.addLinks(groupId, [{ url, title: displayHost(url) }], index)
          return null
        }
        const parsed = applyNoteShortcuts(text.slice(0, NOTE_MAX_LENGTH))
        const { id } = await repo.addNote(
          groupId,
          { text: parsed.text, todo: parsed.todo ?? false, done: parsed.done ?? false },
          { index },
        )
        return id
      },
      async addNote(
        groupId: string,
        placement: { afterId?: string; index?: number } = {},
        todo = false,
      ) {
        const { id } = await repo.addNote(groupId, { text: '', todo }, placement)
        useUi.getState().setEditingNote(id)
        return id
      },
      async updateItem(id: string, patch: repo.ItemPatch) {
        return repo.updateItem(id, patch)
      },
      async deleteItems(ids: readonly string[]) {
        if (ids.length === 0) return
        const result = await repo.deleteItems(ids)
        undoable(t('item.deleted', { count: ids.length }))(result)
        useUi.getState().clearSelection()
      },
      async removeEmptyNote(id: string) {
        await repo.deleteItems([id])
      },
      async combine(ids: readonly string[], targetId: string) {
        const result = await repo.combine(ids, targetId)
        if (!result.ok) {
          const key = {
            'note-with-link': 'combine.noteWithLink',
            'stack-with-note': 'combine.stackWithNote',
            unsupported: 'combine.unsupported',
            'same-item': 'combine.sameItem',
          } as const
          toast({ title: t(key[result.error]), tone: 'error' })
          return false
        }
        undoable(t('stack.created'))(result)
        useUi.getState().clearSelection()
        return true
      },
      async unstack(stackId: string) {
        undoable(t('stack.unstacked'))(await repo.unstackById(stackId))
      },
      openItem(item: Item, event?: { metaKey?: boolean; ctrlKey?: boolean; button?: number }) {
        const url = item.url ?? item.imageUrl
        if (!url) return
        const modifier = !!event?.metaKey || !!event?.ctrlKey || event?.button === 1
        void openUrl(url, {
          newTab: modifier || (settings?.openLinksInNewTab ?? false),
          background: modifier,
          focusExisting: !modifier && (settings?.focusExistingTab ?? true),
        })
      },
    }
  }, [t, locale, settings, categoryId])
}

export type BoardActions = ReturnType<typeof useBoardActions>
