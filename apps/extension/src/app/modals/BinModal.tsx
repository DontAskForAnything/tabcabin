import { RotateCcw, Trash, Trash2 } from 'lucide-react'
import type { Item } from '@tabhangar/core'
import { Button, cn, Favicon, IconButton, Modal } from '@tabhangar/ui'
import { useEffect } from 'react'
import { type BinRow, useBin } from '@/db/bin'
import { BIN_LIMIT, emptyBin, purgeFromBin, restoreFromBin, trimBin } from '@/db/repo'
import { type Locale, type Translate, useLocale, useT } from '@/i18n'
import { faviconUrl, hostSeed } from '@/lib/browser'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../useActive'

export function BinModal({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const rows = useBin(open)
  useEffect(() => {
    if (open) void trimBin()
  }, [open])

  const empty = async () => {
    if (!rows?.length) return
    const ok = await confirmDialog({
      title: t('bin.emptyBin'),
      description: t('bin.emptyConfirm', { count: rows.length }),
      confirmLabel: t('bin.emptyBin'),
      cancelLabel: t('common.cancel'),
      danger: true,
    })
    if (ok) offerUndo(await emptyBin(), { title: t('bin.emptied'), undoLabel: t('common.undo') })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('bin.title')}
      description={t('bin.description', { max: BIN_LIMIT })}
      size="md"
      footer={
        rows && rows.length > 0 ? (
          <>
            <Button
              variant="ghost"
              icon={<Trash size={15} />}
              className="mr-auto text-danger hover:text-danger"
              onClick={() => void empty()}
            >
              {t('bin.emptyBin')}
            </Button>
            <Button onClick={close}>{t('common.close')}</Button>
          </>
        ) : undefined
      }
    >
      {rows && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <div className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-subtle text-ink-3">
            <Trash2 size={26} />
          </div>
          <h3 className="text-[16px] font-semibold">{t('bin.empty')}</h3>
          <p className="max-w-[320px] text-[13.5px] text-ink-3">{t('bin.emptyHint')}</p>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {rows?.map((row) => (
          <BinRowView key={`${row.entity}:${row.row.id}`} row={row} active={active} />
        ))}
      </ul>
    </Modal>
  )
}

function itemKind(item: Item): string {
  if (item.kind === 'note') return item.todo ? 'todo' : 'note'
  return item.kind
}

function describe(row: BinRow, t: Translate): { title: string; kind: string } {
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

function relative(ts: number, locale: Locale): string {
  const seconds = Math.round((ts - Date.now()) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps)
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  return format.format(0, 'minute')
}

function BinIcon({ row }: { row: BinRow }) {
  const tile = 'flex size-10 shrink-0 items-center justify-center rounded-[11px] text-[20px]'
  if (row.entity === 'workspace')
    return <span className={cn(tile, 'bg-card')}>{row.row.emoji}</span>
  if (row.entity === 'group') return <span className={cn(tile, 'bg-card')}>{row.row.emoji}</span>
  if (row.entity === 'category')
    return <span className={cn(tile, 'bg-card text-[15px] font-semibold text-ink-2')}>#</span>
  const item = row.row
  if (item.url)
    return (
      <Favicon
        src={faviconUrl(item.url) ?? item.favIconUrl}
        seed={hostSeed(item.url, item.title)}
        size="md"
      />
    )
  return (
    <span
      className={cn(tile, 'text-[13px]')}
      style={{ background: `var(--note-${item.color ?? 'sand'}-bg)` }}
    />
  )
}

function BinRowView({ row, active }: { row: BinRow; active: ActiveContext }) {
  const t = useT()
  const locale = useLocale()
  const { title, kind } = describe(row, t)

  const restore = async () => {
    if (!active.workspace || !active.category) return
    offerUndo(
      await restoreFromBin(row.entity, row.row.id, {
        workspaceId: active.workspace.id,
        categoryId: active.category.id,
        restoredGroupTitle: t('restored.group'),
      }),
      { title: t('bin.restored'), undoLabel: t('common.undo') },
    )
  }
  const purge = async () =>
    offerUndo(await purgeFromBin(row.entity, row.row.id), {
      title: t('bin.deletedForever'),
      undoLabel: t('common.undo'),
    })

  return (
    <li
      aria-label={title}
      className="group/bin flex items-center gap-3 rounded-[15px] bg-subtle px-3 py-2.5"
    >
      <BinIcon row={row} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-[550]">{title}</div>
        <div className="truncate text-[12.5px] text-ink-3">
          {kind}
          {row.place ? ` · ${t('bin.from', { place: row.place })}` : ''}
          {row.row.deletedAt ? ` · ${relative(row.row.deletedAt, locale)}` : ''}
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        icon={<RotateCcw size={14} />}
        onClick={() => void restore()}
      >
        {t('bin.restore')}
      </Button>
      <IconButton
        label={t('bin.deleteForever')}
        icon={<Trash size={15} />}
        size="sm"
        className="text-ink-3 hover:text-danger"
        onClick={() => void purge()}
      />
    </li>
  )
}
