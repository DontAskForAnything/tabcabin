import { Button, cn, Favicon, IconButton } from '@tabcabin/ui'
import { RotateCcw, Trash } from 'lucide-react'
import type { BinRow } from '@/db/bin'
import { purgeFromBin, restoreFromBin } from '@/db/repo'
import { useLocale, useT } from '@/i18n'
import { faviconUrl, hostSeed } from '@/lib/browser'
import { relativeTime } from '@/lib/time'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../../useActive'
import { describe } from './describe'

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
        src={[faviconUrl(item.url), item.favIconUrl]}
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

export function BinRowView({ row, active }: { row: BinRow; active: ActiveContext }) {
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
          {row.row.deletedAt ? ` · ${relativeTime(row.row.deletedAt, locale)}` : ''}
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
