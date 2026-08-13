import { Trash } from 'lucide-react'
import { displayHost } from '@tabhangar/core'
import { cn, IconButton } from '@tabhangar/ui'
import { useState } from 'react'
import { useT } from '@/i18n'
import type { ItemViewProps } from '../ItemView'
import { selectedRing, useSelectable } from './selection'

export function ImageItem({ item, group, actions }: ItemViewProps) {
  const t = useT()
  const [failed, setFailed] = useState(false)
  const { selected, onClickCapture } = useSelectable(item.id, group.id)
  return (
    <div
      onClickCapture={onClickCapture}
      className={cn(
        'group/item relative overflow-hidden rounded-[14px] bg-subtle',
        selected && selectedRing,
      )}
    >
      <button
        type="button"
        className="block w-full"
        onClick={(event) => actions.openItem(item, event)}
      >
        {failed || !item.imageUrl ? (
          <div className="flex h-32 items-center justify-center text-[12.5px] text-ink-3">
            {item.imageUrl}
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            draggable={false}
            onError={() => setFailed(true)}
            className="max-h-[260px] w-full object-cover"
          />
        )}
      </button>
      {(item.title || item.imageUrl) && (
        <div className="truncate px-3 py-2 text-[12.5px] font-medium text-ink-2">
          {item.title || displayHost(item.imageUrl)}
        </div>
      )}
      <IconButton
        label={t('item.delete')}
        icon={<Trash size={13} />}
        variant="tile"
        size="sm"
        className="absolute top-2 right-2 hidden group-hover/item:flex"
        onClick={() => void actions.deleteItems([item.id])}
      />
    </div>
  )
}
