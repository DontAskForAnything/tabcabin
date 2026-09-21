import { displayHost } from '@tabhangar/core'
import { letterTileFor } from '@tabhangar/ui'
import type { PageInfo } from './types'

/** Icon, title and address of the page. */
export function PageSummary({ page }: { page: PageInfo }) {
  const tile = letterTileFor(displayHost(page.url) || page.title)
  return (
    <div className="flex items-center gap-3">
      {page.favIconUrl ? (
        <span className="flex size-10 items-center justify-center rounded-[11px] bg-white shadow-tile">
          <img src={page.favIconUrl} alt="" className="size-[22px]" />
        </span>
      ) : (
        <span
          className="flex size-10 items-center justify-center rounded-[11px] font-bold shadow-tile"
          style={{ background: tile.bg, color: tile.fg }}
        >
          {tile.letter}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">
          {page.title || displayHost(page.url)}
        </div>
        <div className="truncate text-[12.5px] text-ink-3">{displayHost(page.url)}</div>
      </div>
    </div>
  )
}
