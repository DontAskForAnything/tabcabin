import { toast } from '@tabcabin/ui'
import { countActivity } from '@/db/activity/count'
import * as repo from '@/db/repo'
import type { Translate } from '@/i18n'
import { closeTabs, type TabLike, tabsToLinks } from '@/lib/tabs'
import type { Settings } from '@/settings/settings'
import { useUi } from '@/state/ui'
import { randomEmoji } from '../board/actions'
import { duplicateNote, findDuplicates } from '../shared/duplicates'

/** Saves tabs into a group (or a new one) and closes them when the setting says so. */
export async function saveTabs(
  tabs: readonly TabLike[],
  target: { groupId: string } | { newGroupIn: string; title?: string; emoji?: string },
  ctx: { t: Translate; settings: Settings | undefined },
) {
  const links = tabsToLinks(tabs)
  if (links.length === 0) return
  const duplicates = await findDuplicates(
    links.map((link) => link.url),
    'groupId' in target ? target.groupId : '',
    ctx.settings,
  )
  let groupId: string
  if ('groupId' in target) groupId = target.groupId
  else {
    groupId = (
      await repo.createGroup(target.newGroupIn, {
        emoji: target.emoji ?? randomEmoji(),
        title: target.title,
      })
    ).groupId
    if (!target.title) useUi.getState().setFocusGroupTitle(groupId)
  }
  await repo.addLinks(groupId, links)
  await countActivity({ saved: links.length })
  toast({
    title: ctx.t('dnd.tabsSaved', { count: links.length }),
    tone: 'success',
    ...duplicateNote(duplicates, ctx.t, ctx.settings),
  })
  if (ctx.settings?.closeTabOnSave !== false) await closeTabs(tabs.map((tab) => tab.id))
}
