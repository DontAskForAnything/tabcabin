import type { ActiveContext } from '../useActive'
import { PinnedPanel } from './PinnedPanel'
import { RailPanel } from './RailPanel'

export function TabsPanel({ active }: { active: ActiveContext }) {
  const mode = active.settings?.sidebarMode ?? 'pinned'
  return mode === 'rail' ? <RailPanel active={active} /> : <PinnedPanel active={active} />
}
