import { displayHost } from '@tabcabin/core'
import { Favicon } from '@tabcabin/ui'
import type { PageInfo } from './types'

/** Icon, title and address of the page. */
export function PageSummary({ page }: { page: PageInfo }) {
  return (
    <div className="flex items-center gap-3">
      <Favicon src={page.favIconUrl} seed={displayHost(page.url) || page.title} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">
          {page.title || displayHost(page.url)}
        </div>
        <div className="truncate text-[12.5px] text-ink-3">{displayHost(page.url)}</div>
      </div>
    </div>
  )
}
