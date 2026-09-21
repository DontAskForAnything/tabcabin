import { useRef, useState } from 'react'
import { useT } from '@/i18n'
import { updateSettings } from '@/settings/settings'
import type { ActiveContext } from '../useActive'
import { PanelBody } from './PanelBody'
import { MAX_WIDTH, MIN_WIDTH } from './panelWidth'

export function PinnedPanel({ active }: { active: ActiveContext }) {
  const t = useT()
  const stored = active.settings?.sidebarWidth ?? 292
  const [width, setWidth] = useState<number | null>(null)
  const start = useRef<{ x: number; width: number } | null>(null)
  const current = width ?? stored
  return (
    <nav
      aria-label={t('panel.openTabs')}
      style={{ width: current }}
      className="sticky top-0 h-screen shrink-0 border-r border-line bg-panel"
    >
      <PanelBody active={active} />
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          start.current = { x: event.clientX, width: current }
        }}
        onPointerMove={(event) => {
          if (!start.current) return
          setWidth(
            Math.round(
              Math.min(
                MAX_WIDTH,
                Math.max(MIN_WIDTH, start.current.width + event.clientX - start.current.x),
              ),
            ),
          )
        }}
        onPointerUp={() => {
          start.current = null
          if (width !== null) void updateSettings({ sidebarWidth: width })
          setWidth(null)
        }}
        onDoubleClick={() => void updateSettings({ sidebarWidth: 292 })}
        className="group/resize absolute top-0 -right-1.5 bottom-0 flex w-3 cursor-col-resize justify-center"
      >
        <span className="h-full w-[2px] bg-transparent transition-colors group-hover/resize:bg-accent/40" />
      </div>
    </nav>
  )
}
