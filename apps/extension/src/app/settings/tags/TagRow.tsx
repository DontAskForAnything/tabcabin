import { NOTE_COLORS, type Tag, TAG_LIMITS } from '@tabcabin/core'
import { cn, IconButton, Popover, PopoverContent, PopoverTrigger, toast } from '@tabcabin/ui'
import { Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deleteTag, updateTag } from '@/db/repo'
import { useT } from '@/i18n'
import { offerUndo } from '@/state/undo'

/** One tag in Settings: its colour, its name (renamed on Enter or when leaving the field), how
 * many items have it, and removing it. */
export function TagRow({ tag, count }: { tag: Tag; count: number }) {
  const t = useT()
  const [name, setName] = useState(tag.name)
  useEffect(() => setName(tag.name), [tag.name])

  const rename = async () => {
    if (name.trim() === tag.name) return
    const result = await updateTag(tag.id, { name })
    if (!result.ok) {
      setName(tag.name)
      if (result.error === 'taken') toast({ title: t('tags.taken'), tone: 'error' })
    }
  }

  return (
    <li className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t('tags.color', { name: tag.name })}
            className="size-7 flex-none rounded-[9px] shadow-[inset_0_0_0_1px_rgb(20_24_40/0.1)]"
            style={{ background: `var(--note-${tag.color}-bg)` }}
          />
        </PopoverTrigger>
        <PopoverContent className="grid grid-cols-5 gap-1.5 p-2.5">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={t(`color.${color}`)}
              aria-pressed={tag.color === color}
              onClick={() => void updateTag(tag.id, { color })}
              className={cn(
                'size-7 rounded-[9px] shadow-[inset_0_0_0_1px_rgb(20_24_40/0.1)]',
                tag.color === color && 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]',
              )}
              style={{ background: `var(--note-${color}-bg)` }}
            />
          ))}
        </PopoverContent>
      </Popover>
      <input
        value={name}
        maxLength={TAG_LIMITS.nameLength + 2}
        aria-label={t('tags.rename', { name: tag.name })}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => void rename()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setName(tag.name)
          }
        }}
        className="h-9 min-w-0 flex-1 rounded-[10px] bg-transparent px-2 text-[14px] font-medium outline-none hover:bg-subtle focus:bg-subtle-2 focus:shadow-[0_0_0_2px_var(--focus)]"
      />
      <span className="flex-none text-[12.5px] text-ink-3 tabular-nums">
        {t('tags.used', { count })}
      </span>
      <IconButton
        label={t('tags.delete', { name: tag.name })}
        icon={<Trash size={15} />}
        onClick={async () =>
          offerUndo(await deleteTag(tag.id), {
            title: t('tags.deleted', { name: tag.name }),
            undoLabel: t('common.undo'),
          })
        }
      />
    </li>
  )
}
