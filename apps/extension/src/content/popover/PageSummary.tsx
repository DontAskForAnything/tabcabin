import { Pencil } from 'lucide-react'
import { displayHost } from '@tabcabin/core'
import { Favicon } from '@tabcabin/ui'
import type { Translate } from '@/i18n'
import type { PageInfo } from './types'

/** Icon, title and address of the page; the title can be changed before saving. */
export function PageSummary({
  page,
  title,
  onTitle,
  onDone,
  readOnly,
  t,
}: {
  page: PageInfo
  title: string
  onTitle: (title: string) => void
  /** Enter in the title: go on to the note. */
  onDone: () => void
  readOnly: boolean
  t: Translate
}) {
  return (
    <div className="flex items-center gap-3">
      <Favicon src={page.favIconUrl} seed={displayHost(page.url) || page.title} size="lg" />
      <div className="min-w-0 flex-1">
        <label className="group -ml-1.5 flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 focus-within:bg-subtle focus-within:shadow-[0_0_0_2px_var(--focus)] hover:bg-subtle">
          <input
            value={title}
            onChange={(event) => onTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.metaKey || event.ctrlKey) return
              event.preventDefault()
              onDone()
            }}
            readOnly={readOnly}
            aria-label={t('editor.name')}
            placeholder={displayHost(page.url)}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ellipsis font-semibold text-ink outline-none placeholder:text-ink-3"
          />
          {!readOnly && (
            <Pencil
              size={13}
              aria-hidden="true"
              className="shrink-0 text-ink-3 transition group-hover:text-ink-2"
            />
          )}
        </label>
        <div className="mt-0.5 truncate text-[12.5px] text-ink-3">{displayHost(page.url)}</div>
      </div>
    </div>
  )
}
