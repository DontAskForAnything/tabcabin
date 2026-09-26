import { Button, toast } from '@tabhangar/ui'
import { addGroupWithLinks, loadTopSites } from '@/data/browserLinks'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../../useActive'
import { Row } from '../Row'

/** Bring in Chrome bookmark folders or the most visited sites. */
export function BrowserImportRows({ active }: { active: ActiveContext }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)

  const addTopSites = async () => {
    // Ask inside the click so the browser can show its prompt.
    const granted = await browser.permissions.request({ permissions: ['topSites'] })
    if (!granted) return toast({ title: t('transfer.permissionDenied'), tone: 'info' })
    if (!active.category) return
    const result = await addGroupWithLinks(
      active.category.id,
      { title: t('transfer.topSitesGroup'), emoji: '⭐' },
      (await loadTopSites()).slice(0, 12),
    )
    offerUndo(result, {
      title: t('transfer.topSitesAdded', { count: result.count }),
      undoLabel: t('common.undo'),
    })
  }

  return (
    <>
      <Row label={t('transfer.chromeBookmarks')} hint={t('transfer.chromeBookmarksHint')}>
        <Button size="sm" onClick={() => openModal({ type: 'bookmarks' })}>
          {t('transfer.chooseFolders')}
        </Button>
      </Row>
      <Row label={t('transfer.topSites')} hint={t('transfer.topSitesHint')}>
        <Button size="sm" onClick={() => void addTopSites()}>
          {t('transfer.add')}
        </Button>
      </Row>
    </>
  )
}
