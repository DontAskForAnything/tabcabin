import { displayHost } from '@tabhangar/core'
import { cn, Favicon } from '@tabhangar/ui'
import { faviconUrl, hostSeed } from '@/lib/browser'
import { useDrag } from './store'

/** The lifted card that follows the pointer. */
export function DragPreview() {
  const overlay = useDrag((s) => s.overlay)
  const valid = useDrag((s) => s.target !== null)
  const trash = useDrag((s) => s.target?.kind === 'trash')
  const combining = useDrag((s) => s.target?.kind === 'combine')
  if (!overlay) return null

  const border = trash ? 'border-danger' : valid ? 'border-success' : 'border-line'
  return (
    <div className="pointer-events-none relative w-[290px] -rotate-[2.5deg] cursor-grabbing">
      <div
        className={cn(
          'flex items-center gap-3 rounded-[14px] border-2 bg-card px-3 py-2.5 shadow-lift transition-[border-color,transform] duration-150',
          border,
          combining && 'scale-95',
        )}
      >
        {overlay.kind === 'group' ? (
          <span className="text-[26px] leading-none">{overlay.emoji}</span>
        ) : overlay.kind === 'note' ? (
          <span
            className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] text-[15px]"
            style={{
              background: overlay.noteColor
                ? `var(--note-${overlay.noteColor}-bg)`
                : 'var(--subtle)',
              color: overlay.noteColor ? `var(--note-${overlay.noteColor}-ink)` : 'var(--ink-2)',
            }}
          >
            ✎
          </span>
        ) : (
          <Favicon
            src={[faviconUrl(overlay.url), overlay.favIconUrl]}
            seed={hostSeed(overlay.url, overlay.title)}
            size="md"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{overlay.title}</div>
          {(overlay.subtitle || overlay.url) && (
            <div className="truncate text-[12px] text-ink-3">
              {overlay.subtitle ?? displayHost(overlay.url)}
            </div>
          )}
        </div>
      </div>
      {overlay.count > 1 && (
        <span
          className={cn(
            'absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-[9px] border-2 bg-card text-[13px] font-bold shadow-tile',
            border,
          )}
        >
          {overlay.count}
        </span>
      )}
    </div>
  )
}
