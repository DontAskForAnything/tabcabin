import { useRef } from 'react'
import { MAX_WIDTH, MIN_WIDTH } from './width'

export function GroupResizeHandle({
  width,
  onPreview,
  onCommit,
  label,
}: {
  width: number
  onPreview: (width: number) => void
  onCommit: (width: number | null) => void
  label: string
}) {
  const start = useRef<{ x: number; width: number } | null>(null)
  const latest = useRef(width)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      onDoubleClick={() => onCommit(null)}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, width }
        latest.current = width
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        const next = Math.round(
          Math.min(
            MAX_WIDTH,
            Math.max(MIN_WIDTH, start.current.width + event.clientX - start.current.x),
          ),
        )
        latest.current = next
        onPreview(next)
      }}
      onPointerUp={() => {
        if (!start.current) return
        start.current = null
        onCommit(latest.current)
      }}
      className="group/resize absolute top-6 -right-2.5 bottom-6 flex w-5 cursor-col-resize justify-center"
    >
      <span className="h-full w-[3px] rounded-full bg-transparent transition-colors group-hover/resize:bg-accent/40" />
    </div>
  )
}
