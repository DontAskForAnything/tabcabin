import { Skeleton } from '@tabhangar/ui'
import { BoardView } from './board/BoardView'
import { Modals } from './modals/Modals'
import type { Surface } from './mount'
import { TabsPanel } from './panel/TabsPanel'
import { TopBar } from './topbar/TopBar'
import { type ActiveContext } from './useActive'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { NoteToolbar } from './board/NoteToolbar'
import { SelectionBar } from './board/SelectionBar'

export function Shell({ surface, active }: { surface: Surface; active: ActiveContext }) {
  useGlobalShortcuts(active)
  const compact = surface === 'sidepanel'
  return (
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
      <NoteToolbar />
      <SelectionBar active={active} />
    </div>
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
