import { Plus } from 'lucide-react'

export interface SketchGroup {
  emoji: string
  lines: number
}

/** A small drawing of a board: a card per group with its emoji and a few lines. */
export function BoardSketch({ groups }: { groups: SketchGroup[] }) {
  return (
    <div aria-hidden className="flex h-[92px] gap-1.5 overflow-hidden rounded-[11px] bg-canvas p-2">
      {groups.map((group, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-1 flex-col gap-[5px] self-start rounded-[7px] bg-card p-1.5 shadow-tile"
        >
          <span className="text-[13px] leading-none">{group.emoji}</span>
          {Array.from({ length: group.lines }, (_, line) => (
            <span
              key={line}
              className="h-[5px] rounded-full bg-subtle-2"
              style={{ width: `${90 - ((line * 23 + index * 13) % 40)}%` }}
            />
          ))}
        </div>
      ))}
      {groups.length === 0 && (
        <div className="flex w-[31%] items-center justify-center rounded-[7px] border border-dashed border-ink-4/70 text-ink-4">
          <Plus size={14} />
        </div>
      )}
    </div>
  )
}
