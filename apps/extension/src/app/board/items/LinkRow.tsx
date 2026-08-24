import { Bell, Pencil, Trash } from 'lucide-react'
import { displayUrl } from '@tabhangar/core'
import { cn, Favicon, IconButton } from '@tabhangar/ui'
import { useT } from '@/i18n'
import { faviconUrl, hostSeed } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { ReminderChip } from '../../reminders/ReminderChip'
import type { ItemViewProps } from '../ItemView'
import { selectedRing, useSelectable } from './selection'

export function LinkRow({
  item,
  group,
  actions,
  active,
  nested = false,
}: ItemViewProps & { nested?: boolean }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const editReminder = useUi((s) => s.editReminder)
  const reminder = group.reminders[item.id]
  const { selected, onClickCapture } = useSelectable(item.id, group.id)
  const showUrl = active.settings?.showUrls !== false
  const url = item.url ?? ''

  return (
    <div
      className={cn(
        'group/item relative flex flex-col rounded-[13px] transition-[background,box-shadow] duration-150 hover:bg-card hover:shadow-card',
        selected && selectedRing,
      )}
    >
      <a
        href={url}
        draggable={false}
        onClickCapture={onClickCapture}
        onClick={(event) => {
          event.preventDefault()
          actions.openItem(item, event)
        }}
        className={cn(
          'flex min-w-0 items-center gap-3 px-2',
          nested ? 'py-1.5 dense:py-1' : 'py-[7px] dense:py-[3px]',
        )}
      >
        <Favicon
          src={faviconUrl(url) ?? item.favIconUrl}
          seed={hostSeed(url, item.title)}
          size={nested ? 'sm' : 'md'}
        />
        <span className="min-w-0 flex-1 pr-1 group-hover/item:pr-[100px]">
          <span className="block truncate text-[14.5px] leading-snug font-[550]">
            {item.title || displayUrl(url)}
          </span>
          {showUrl && (
            <span className="block truncate text-[12.5px] text-ink-3">{displayUrl(url)}</span>
          )}
        </span>
      </a>
      <div className="absolute top-[9px] right-2 hidden items-center gap-1 group-hover/item:flex">
        <IconButton
          label={t('item.reminder')}
          icon={<Bell size={13} />}
          variant="soft"
          size="sm"
          onClick={() => editReminder(item.id)}
        />
        <IconButton
          label={t('item.edit')}
          icon={<Pencil size={13} />}
          variant="soft"
          size="sm"
          onClick={() => openModal({ type: 'linkEditor', itemId: item.id })}
        />
        <IconButton
          label={t('item.delete')}
          icon={<Trash size={13} />}
          variant="soft"
          size="sm"
          onClick={() => void actions.deleteItems([item.id])}
        />
      </div>
      {reminder && (
        <div className={cn('-mt-0.5 mb-1.5 flex', nested ? 'ml-11' : 'ml-14')}>
          <ReminderChip reminder={reminder} />
        </div>
      )}
      {item.text && (
        <div
          className="mx-2 mb-2 ml-14 rounded-[10px] px-[11px] py-2 text-[13px] leading-[1.45] whitespace-pre-line"
          style={{
            background: `var(--note-${item.color ?? 'sky'}-bg)`,
            color: `var(--note-${item.color ?? 'sky'}-ink)`,
          }}
        >
          {item.text}
        </div>
      )}
    </div>
  )
}
