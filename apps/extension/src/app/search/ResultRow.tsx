import { displayUrl } from '@tabcabin/core'
import { cn, Favicon, Kbd } from '@tabcabin/ui'
import { CircleCheck, Image as ImageIcon, StickyNote } from 'lucide-react'
import { faviconUrl, hostSeed } from '@/lib/browser'
import { highlightParts, type SearchHit } from './engine'

export function ResultRow({
  hit,
  selected,
  onHover,
  onClick,
  action,
}: {
  hit: SearchHit
  selected: boolean
  onHover: () => void
  onClick: (reveal: boolean) => void
  action: string
}) {
  const { doc } = hit
  const icon =
    doc.kind === 'note' || doc.kind === 'todo' ? (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--note-amber-bg)] text-[var(--note-amber-ink)]">
        {doc.kind === 'todo' ? <CircleCheck size={16} /> : <StickyNote size={16} />}
      </span>
    ) : doc.kind === 'image' ? (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-subtle-2 text-ink-2">
        <ImageIcon size={16} />
      </span>
    ) : (
      <Favicon
        src={[faviconUrl(doc.url), doc.favIconUrl]}
        seed={hostSeed(doc.url, doc.title)}
        size="md"
      />
    )
  return (
    <button
      type="button"
      data-selected={selected}
      onMouseMove={onHover}
      onClick={(event) => onClick(event.metaKey || event.ctrlKey)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left',
        selected && 'bg-accent-soft',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[14.5px] font-[550]',
            doc.done && 'text-ink-3 line-through',
          )}
        >
          {highlightParts(doc.title || doc.url || '', hit.titleRanges).map((part, i) =>
            part.hit ? (
              <mark key={i} className="rounded-[3px] bg-accent-soft px-px text-inherit">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </span>
        <span className="block truncate text-[12.5px] text-ink-3">
          {doc.path}
          {doc.url && doc.kind !== 'tab' ? ` · ${displayUrl(doc.url)}` : ''}
        </span>
      </span>
      {selected && (
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-accent-ink">
          {action}
          <Kbd className="bg-card">↵</Kbd>
        </span>
      )}
    </button>
  )
}
