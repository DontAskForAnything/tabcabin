import { cn } from '@tabcabin/ui'
import { Check } from 'lucide-react'
import { BoardSketch, type SketchGroup } from './BoardSketch'

/** One way to start: a sketch of the board it gives, its name and a line about it. */
export function StartCard(props: {
  title: string
  text: string
  groups: SketchGroup[]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      onClick={props.onSelect}
      className={cn(
        'relative flex flex-col gap-3 rounded-[16px] border bg-card p-2.5 text-left transition-[border-color,box-shadow] outline-none focus-visible:shadow-[0_0_0_2px_var(--focus)]',
        props.selected
          ? 'border-accent shadow-[0_0_0_1px_var(--accent)]'
          : 'border-line hover:border-accent/50',
      )}
    >
      <BoardSketch groups={props.groups} />
      <span className="px-1.5 pb-1">
        <span className="block text-[14px] font-semibold">{props.title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{props.text}</span>
      </span>
      {props.selected && (
        <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
