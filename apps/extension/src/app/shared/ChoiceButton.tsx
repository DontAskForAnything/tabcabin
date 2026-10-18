import { cn } from '@tabcabin/ui'
import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

/** A large option with an icon, a title and a hint (first sync, signing out). */
export function ChoiceButton(props: {
  icon: ReactNode
  title: string
  hint: string
  disabled: boolean
  /** Shows a spinner in place of the icon while the choice runs. */
  busy?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      aria-busy={props.busy || undefined}
      onClick={props.onClick}
      className={cn(
        'flex items-center gap-3.5 rounded-[14px] border border-line bg-card px-4 py-3.5 text-left shadow-tile transition-[border-color,box-shadow] outline-none hover:border-accent/50 focus-visible:shadow-[0_0_0_2px_var(--focus)]',
        !props.busy && 'disabled:opacity-50',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
        {props.busy ? (
          <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />
        ) : (
          props.icon
        )}
      </span>
      <span>
        <span className="block text-[14px] font-semibold">{props.title}</span>
        <span className="block text-[12.5px] text-ink-3">{props.hint}</span>
      </span>
    </button>
  )
}
