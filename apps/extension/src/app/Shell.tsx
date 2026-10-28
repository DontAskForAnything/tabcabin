import { Skeleton } from '@tabcabin/ui'
import { useEffect } from 'react'
import { useUi } from '@/state/ui'
import { BoardView } from './board/BoardView'
import { DndProvider } from './dnd/DndProvider'
import { TrashZone } from './dnd/DropMarkers'
import { FeedbackCard } from './feedback/FeedbackCard'
import { Modals } from './modals/Modals'
import { Onboarding } from './onboarding/Onboarding'
import type { Surface } from './mount'
import { TabsPanel } from './panel/TabsPanel'
import { TipCard } from './tips/TipCard'
import { TopBar } from './topbar/TopBar'
import { type ActiveContext } from './useActive'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { NoteToolbar } from './board/noteToolbar/NoteToolbar'
import { SelectionBar } from './board/SelectionBar'

export function Shell({ surface, active }: { surface: Surface; active: ActiveContext }) {
  useGlobalShortcuts(active)
  useHashViews()
  const compact = surface === 'sidepanel'
  return (
    <DndProvider active={active}>
      <div className="flex min-h-screen bg-canvas text-[14px] text-ink">
        {!compact && <TabsPanel active={active} />}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <TopBar active={active} compact={compact} />
          {active.ready && active.category && active.workspace ? (
            <BoardView key={active.category.id} active={active} compact={compact} />
          ) : (
            <BoardSkeleton />
          )}
        </main>
        <Modals active={active} />
        {!compact && <Onboarding active={active} />}
        {!compact && <FeedbackCard />}
        {!compact && <TipCard active={active} />}
        <NoteToolbar />
        <SelectionBar active={active} />
        <TrashZone enabled={active.settings?.trashZone ?? true} />
      </div>
    </DndProvider>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex gap-5 px-7 pt-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex h-[420px] w-[332px] flex-col gap-4 rounded-card bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Opens a view requested in the URL hash (`#reminders`, `#bin`), e.g. from a notification. */
function useHashViews() {
  useEffect(() => {
    const open = () => {
      const view = location.hash.slice(1)
      if (view !== 'reminders' && view !== 'bin') return
      useUi.getState().openModal({ type: view })
      history.replaceState(null, '', location.pathname + location.search)
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
}
