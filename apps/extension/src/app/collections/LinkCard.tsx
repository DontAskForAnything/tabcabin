import { Bell, Pencil, Trash } from 'lucide-react'
import { displayHost } from '@tabcabin/core'
import { cn, Favicon, IconButton } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { faviconUrl, hostSeed } from '@/lib/browser'
import { useUi } from '@/state/ui'
import type { ItemViewProps } from '../board/ItemView'
import { ReminderChip } from '../reminders/ReminderChip'
import { selectedRing, useSelectable } from '../board/items/selection'

/** Link shown as a tile in the Collections view. */
export function LinkCard({ item, group, actions }: ItemViewProps) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const editReminder = useUi((s) => s.editReminder)
  const reminder = group.reminders[item.id]
  const { selected, onClickCapture } = useSelectable(item.id, group.id)
  const url = item.url ?? ''
  return (
    <div
      className={cn(
        'group/card relative flex min-h-[72px] flex-col justify-center rounded-[14px] transition-[background,box-shadow,transform] duration-150',
        'bg-subtle hover:bg-card hover:shadow-card',
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
        className="flex min-w-0 items-center gap-3 px-3 py-3"
      >
        <Favicon
          src={[faviconUrl(url), item.favIconUrl]}
          seed={hostSeed(url, item.title)}
          size="md"
        />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[14px] leading-snug font-[550]">
            {item.title || displayHost(url)}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-3">{displayHost(url)}</span>
        </span>
      </a>
      {reminder && (
        <div className="-mt-1.5 mb-2.5 ml-[60px] flex pr-3">
          <ReminderChip reminder={reminder} />
        </div>
      )}
      {item.text && (
        <div
          className="mx-3 mb-3 -mt-1 line-clamp-3 rounded-[9px] px-2.5 py-1.5 text-[12.5px] leading-snug whitespace-pre-line"
          style={{
            background: `var(--note-${item.color ?? 'sky'}-bg)`,
            color: `var(--note-${item.color ?? 'sky'}-ink)`,
          }}
        >
          {item.text}
        </div>
      )}
      <div className="absolute top-2 right-2 hidden gap-1 group-focus-within/card:flex group-hover/card:flex">
        <IconButton
          label={t('item.reminder')}
          icon={<Bell size={12} />}
          variant="tile"
          size="xs"
          onClick={() => editReminder(item.id)}
        />
        <IconButton
          label={t('item.edit')}
          icon={<Pencil size={12} />}
          variant="tile"
          size="xs"
          onClick={() => openModal({ type: 'linkEditor', itemId: item.id })}
        />
        <IconButton
          label={t('item.delete')}
          icon={<Trash size={12} />}
          variant="tile"
          size="xs"
          onClick={() => void actions.deleteItems([item.id])}
        />
      </div>
    </div>
  )
}
