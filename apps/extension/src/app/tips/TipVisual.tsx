import type { LucideIcon } from 'lucide-react'

/** "Ctrl+Shift+S" → Ctrl, Shift, S; a Mac's "⇧⌘S" → ⇧, ⌘, S. */
function keyCaps(keys: string): string[] {
  if (keys.length > 1 && keys.includes('+')) return keys.split('+')
  return Array.from(keys)
}

/** The top of a tip card: the keys to press as big keycaps, or an icon. */
export function TipVisual({ keys, icon: Icon }: { keys?: string; icon?: LucideIcon }) {
  return (
    <div
      aria-hidden
      className="flex h-[92px] items-center justify-center gap-2 bg-accent-soft text-accent-ink"
    >
      {keys
        ? keyCaps(keys).map((key, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[15px] font-semibold">+</span>}
              <kbd className="flex h-11 min-w-11 items-center justify-center rounded-[11px] bg-card px-3 font-mono text-[18px] font-medium text-ink shadow-[0_3px_0_var(--line),var(--shadow-tile)]">
                {key}
              </kbd>
            </span>
          ))
        : Icon && <Icon size={40} strokeWidth={1.6} />}
    </div>
  )
}
