import { displayHost } from '@tabcabin/core'
import { Favicon, type TileSize } from '@tabcabin/ui'
import { faviconUrl } from '@/lib/browser'
import type { OpenTab } from '../useOpenTabs'

export function TabFavicon({ tab, size }: { tab: OpenTab; size: TileSize }) {
  return (
    <Favicon
      src={[faviconUrl(tab.url), tab.favIconUrl]}
      seed={displayHost(tab.url) || tab.title}
      size={size}
    />
  )
}
