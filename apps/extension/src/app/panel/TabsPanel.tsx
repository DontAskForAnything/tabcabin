import { cn } from '@tabhangar/ui'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { updateSettings } from '@/settings/settings'
import { useDrag } from '../dnd/store'
import { HangarMark } from '../HangarMark'
import type { ActiveContext } from '../useActive'
import { PanelBody, usePanelData } from './PanelBody'
import { usePanel } from './panelStore'
import { TabRow } from './TabRow'

const MIN_WIDTH = 240
const MAX_WIDTH = 440

export function TabsPanel({ active }: { active: ActiveContext }) {
  const mode = active.settings?.sidebarMode ?? 'pinned'
  return mode === 'rail' ? <RailPanel active={active} /> : <PinnedPanel active={active} />
}

function PinnedPanel({ active }: { active: ActiveContext }) {
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

function RailPanel({ active }: { active: ActiveContext }) {
  const t = useT()
  const { inWindow } = usePanelData()
  const peek = usePanel((s) => s.peek)
  const setPeek = usePanel((s) => s.setPeek)
  const dragging = useDrag((s) => s.source !== null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const width = active.settings?.sidebarWidth ?? 292

  useEffect(() => {
    if (dragging) setPeek(false)
  }, [dragging, setPeek])

  const open = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPeek(true), 180)
  }
  const close = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPeek(false), 220)
  }

  const expanded = peek && !dragging

  // The rail keeps its place in the layout; the panel itself widens over the board on hover.
  return (
    <div className="sticky top-0 z-40 h-screen w-[76px] shrink-0">
      <motion.nav
        aria-label={t('panel.openTabs')}
        onMouseEnter={open}
        onMouseLeave={close}
        initial={false}
        animate={{ width: expanded ? width : 76 }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        className={cn(
          'absolute inset-y-0 left-0 overflow-hidden border-r border-line bg-panel transition-[box-shadow,border-radius] duration-200',
          expanded && 'rounded-r-[22px] shadow-pop',
        )}
      >
        <div className="relative h-full" style={{ width: expanded ? width : 76 }}>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              className="h-full"
              style={{ width }}
            >
              <PanelBody active={active} onPinChange={() => setPeek(false)} />
            </motion.div>
          ) : (
            <div className="flex h-full w-[76px] flex-col items-center gap-3 py-[18px]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white shadow-glow">
                <HangarMark size={22} />
              </span>
              <span className="mt-1.5 rounded-lg bg-subtle-2 px-2 py-1 text-[12px] font-semibold text-ink-2">
                {inWindow.length}
              </span>
              <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-2 pt-1 pb-2">
                {inWindow.map((tab) => (
                  <TabRow
                    key={tab.id}
                    tab={tab}
                    allTabs={inWindow}
                    active={active}
                    variant="tile"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.nav>
    </div>
  )
}
