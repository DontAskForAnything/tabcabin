import { IconButton } from '@tabcabin/ui'
import { AppWindow, Layers } from 'lucide-react'
import type { BoardGroup } from '@/db/hooks'
import { useT } from '@/i18n'
import type { OpenGroupIn } from '@/settings/settings'
import type { BoardActions } from '../actions'

/**
 * Opens every link of the group in one click, for example a window saved with "Save as one group
 * and close": in a new window, or as a tab group in this one (Settings → General). Shows on hover
 * and keyboard focus, like the item actions.
 */
export function RestoreButton({
  group,
  actions,
  openIn,
}: {
  group: BoardGroup
  actions: BoardActions
  openIn: OpenGroupIn
}) {
  const t = useT()
  const hasLinks = group.allItems.some((item) => item.kind === 'link')
  if (!hasLinks) return null
  const here = openIn === 'here'
  return (
    <IconButton
      label={t(here ? 'group.openAll' : 'group.openInWindow')}
      icon={here ? <Layers size={16} /> : <AppWindow size={16} />}
      size="sm"
      className="text-ink-4 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
      onClick={() => void actions.openGroup(group, !here)}
    />
  )
}
