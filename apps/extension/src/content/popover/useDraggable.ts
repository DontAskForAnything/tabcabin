import { type PointerEvent, useRef, useState } from 'react'

/** Lets the popover be dragged by its top bar (buttons inside it still work). */
export function useDraggable() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  return {
    style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
    handle: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if ((event.target as HTMLElement).closest('button')) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (!drag.current) return
        setOffset({
          x: drag.current.ox + event.clientX - drag.current.x,
          y: drag.current.oy + event.clientY - drag.current.y,
        })
      },
      onPointerUp() {
        drag.current = null
      },
    },
  }
}
