/**
 * Items that land in another list (pinned to a link, taken off it, moved to another group) glide
 * from where they were let go into their new place, instead of popping up there.
 */

interface Takeoff {
  ids: string[]
  from: { left: number; top: number }
  /** Tilted like the card that follows the pointer. */
  tilted: boolean
  until: number
}

let takeoff: Takeoff | null = null

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Remembers where items left from: the drop point, or their old place for a button. */
export function rememberTakeoff(ids: readonly string[], from: DOMRect, tilted = false) {
  takeoff = {
    ids: [...ids],
    from: { left: from.left, top: from.top },
    tilted,
    until: performance.now() + 1500,
  }
}

/** Called when an item appears in a list: glides it in if it has just been moved there. */
export function glideIn(id: string, node: HTMLElement) {
  if (!takeoff || performance.now() > takeoff.until) return
  const index = takeoff.ids.indexOf(id)
  if (index < 0) return
  const { from, tilted } = takeoff
  takeoff.ids[index] = ''
  if (reducedMotion()) return
  const to = node.getBoundingClientRect()
  const dx = from.left - to.left
  const dy = from.top - to.top
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
  node.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) rotate(${tilted ? -2.5 : 0}deg) scale(${tilted ? 0.97 : 1})`,
        opacity: 0.75,
      },
      { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
    ],
    // A soft landing with a hint of overshoot; several items follow each other.
    {
      duration: 420,
      delay: index * 45,
      easing: 'cubic-bezier(.2,.85,.25,1.08)',
      fill: 'backwards',
    },
  )
}
