import type { Item } from '@tabcabin/core'
import type { BinRow } from '@/db/bin'
import type { Translate } from '@/i18n'

/** Title and kind of a bin entry, for the list. */

function itemKind(item: Item): string {
  if (item.kind === 'note') return item.todo ? 'todo' : 'note'
  return item.kind
}

export function describe(row: BinRow, t: Translate): { title: string; kind: string } {
  switch (row.entity) {
    case 'workspace':
      return { title: row.row.name, kind: t('bin.kind.workspace') }
    case 'category':
      return { title: row.row.name, kind: t('bin.kind.category') }
    case 'group':
      return {
        title: row.row.title || t('item.untitled'),
        kind: `${t('bin.kind.group')} · ${t('bin.items', { count: row.itemCount })}`,
      }
    case 'item': {
      const item = row.row
      const title =
        item.kind === 'note' ? item.text.split('\n')[0] || item.title : item.title || item.url
      const kind = itemKind(item) as 'link' | 'note' | 'todo' | 'image' | 'stack'
      return { title: title || t('item.untitled'), kind: t(`bin.kind.${kind}`) }
    }
  }
}
