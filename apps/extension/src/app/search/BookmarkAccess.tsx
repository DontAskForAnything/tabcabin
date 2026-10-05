import { Bookmark } from 'lucide-react'
import { Button } from '@tabcabin/ui'
import { useT } from '@/i18n'

/** Asks for the bookmarks permission before bookmarks can be searched. */
export function BookmarkAccess({ onAllow }: { onAllow: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <Bookmark size={26} className="text-ink-3" />
      <p className="text-[14px] text-ink-2">{t('search.allowBookmarks')}</p>
      <Button variant="primary" size="sm" onClick={onAllow}>
        {t('search.allow')}
      </Button>
    </div>
  )
}
