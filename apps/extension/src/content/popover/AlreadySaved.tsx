import { Check } from 'lucide-react'
import type { PopoverData } from '@/background/popover'

/** Where this page is saved already, with up to two of its notes. */
export function AlreadySaved({ savedIn }: { savedIn: PopoverData['savedIn'] }) {
  return (
    <div className="rounded-[10px] bg-success-soft px-2.5 py-2 text-[12.5px] font-medium text-success">
      <div className="flex items-center gap-2">
        <Check size={14} strokeWidth={2.6} />
        {savedIn.length === 1 ? savedIn[0]!.path : `${savedIn.length}× · ${savedIn[0]!.path}`}
      </div>
      {savedIn
        .filter((entry) => entry.text)
        .slice(0, 2)
        .map((entry) => (
          <div
            key={entry.itemId}
            className="mt-1.5 rounded-lg px-2 py-1.5 text-[12.5px] whitespace-pre-line"
            style={{
              background: `var(--note-${entry.color ?? 'sky'}-bg)`,
              color: `var(--note-${entry.color ?? 'sky'}-ink)`,
            }}
          >
            {entry.text}
          </div>
        ))}
    </div>
  )
}
