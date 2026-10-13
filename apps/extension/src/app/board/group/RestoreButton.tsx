import { IconButton } from '@tabcabin/ui'
import { AppWindow } from 'lucide-react'
import type { BoardGroup } from '@/db/hooks'
import { useT } from '@/i18n'
import type { BoardActions } from '../actions'

/**
 * Opens every link of the group in a new window in one click, for example a window saved with
 * "Save as one group and close". Shows on hover and keyboard focus, like the item actions.
 */
export function RestoreButton({ group, actions }: { group: BoardGroup; actions: BoardActions }) {
  const t = useT()
  const hasLinks = group.allItems.some((item) => item.kind === 'link')
  if (!hasLinks) return null
  return (
    <IconButton
      label={t('group.openInWindow')}
      icon={<AppWindow size={16} />}
      size="sm"
      className="text-ink-4 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"
      onClick={() => void actions.openGroup(group, true)}
    />
  )
}
