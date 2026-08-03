import { TooltipProvider, Toaster, useApplyTheme } from '@tabhangar/ui'
import { HangarMark } from './HangarMark'
import type { Surface } from './mount'

export function App({ surface }: { surface: Surface }) {
  useApplyTheme('system')
  return (
    <TooltipProvider>
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[13px] bg-accent text-white shadow-glow">
            <HangarMark size={24} />
          </span>
          <span className="text-[22px] font-semibold tracking-[-0.02em]">TabHangar</span>
          <span className="rounded-md bg-subtle-2 px-2 py-0.5 text-[12px] text-ink-3">
            {surface}
          </span>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
