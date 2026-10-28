import { create } from 'zustand'

/** The line crossing a ticked to-do out, and a moment to see it, before it flies off. */
const STRIKE_MS = 950
/** The flight into the group's finished to-dos. */
export const FLIGHT_MS = 640

/** A to-do ticked off a moment ago: being crossed out, then flying into the fold. */
export type DonePhase = 'striking' | 'leaving'

interface JustDoneState {
  /** To-dos that stay in their list while they animate. */
  phases: Record<string, DonePhase>
  /** Starts the animation of a to-do that was just ticked off (not with reduced motion). */
  tickOff: (id: string) => void
  /** Ends it at once, for example when the to-do is ticked back on. */
  forget: (id: string) => void
}

const timers = new Map<string, ReturnType<typeof setTimeout>[]>()

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const useJustDone = create<JustDoneState>()((set) => {
  const setPhase = (id: string, phase: DonePhase | null) =>
    set(({ phases }) => {
      const next = { ...phases }
      if (phase) next[id] = phase
      else delete next[id]
      return { phases: next }
    })
  const forget = (id: string) => {
    for (const timer of timers.get(id) ?? []) clearTimeout(timer)
    timers.delete(id)
    setPhase(id, null)
  }
  return {
    phases: {},
    tickOff(id) {
      forget(id)
      if (reducedMotion()) return
      setPhase(id, 'striking')
      timers.set(id, [
        setTimeout(() => setPhase(id, 'leaving'), STRIKE_MS),
        setTimeout(() => forget(id), STRIKE_MS + FLIGHT_MS),
      ])
    },
    forget,
  }
})
