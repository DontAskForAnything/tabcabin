import { FLIGHT_MS } from './justDone'

/**
 * A ticked-off to-do leaves its list: a copy of it flies in an arc into the group's finished
 * to-dos while its row closes up. Returns a function that stops both (when the list re-renders
 * first, or the to-do is ticked back on).
 */
export function flyAway(row: HTMLElement, text: HTMLElement, groupId: string): () => void {
  const target = document.querySelector(
    `[data-done-fold="${CSS.escape(groupId)}"] [data-done-pill]`,
  )
  const animations: Animation[] = []
  let ghost: HTMLElement | null = null

  if (target) {
    const from = text.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    ghost = text.cloneNode(true) as HTMLElement
    ghost.setAttribute('aria-hidden', 'true')
    ghost.removeAttribute('role')
    ghost.removeAttribute('tabindex')
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: '0',
      zIndex: '60',
      pointerEvents: 'none',
      boxShadow: 'var(--shadow-tile)',
    })
    document.body.append(ghost)
    const dx = to.left + to.width / 2 - (from.left + from.width / 2)
    const dy = to.top + to.height / 2 - (from.top + from.height / 2)
    const flight = ghost.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '12px' },
        {
          transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 26}px) scale(0.62)`,
          opacity: 1,
          borderRadius: '14px',
          offset: 0.38,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(0.1)`,
          opacity: 0.35,
          borderRadius: '999px',
        },
      ],
      { duration: FLIGHT_MS, easing: 'cubic-bezier(.45,0,.4,1)' },
    )
    flight.onfinish = () => ghost?.remove()
    animations.push(flight)
  }

  const list = row.parentElement
  const gap = list ? parseFloat(getComputedStyle(list).rowGap) || 0 : 0
  row.style.overflow = 'hidden'
  animations.push(
    row.animate(
      [
        { height: `${row.offsetHeight}px`, opacity: 1, marginBottom: '0px' },
        { height: '0px', opacity: 0, marginBottom: `${-gap}px` },
      ],
      { duration: 320, delay: 80, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' },
    ),
  )

  return () => {
    for (const animation of animations) animation.cancel()
    row.style.overflow = ''
    ghost?.remove()
  }
}
