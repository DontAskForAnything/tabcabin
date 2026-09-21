import { cn } from '@tabhangar/ui'
import { useT } from '@/i18n'
import { type Scope, SCOPES } from './scopes'

export function ScopeTabs({ scope, onChange }: { scope: Scope; onChange: (scope: Scope) => void }) {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
      {SCOPES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'h-[30px] rounded-[9px] px-3 text-[12.5px] font-medium transition-colors',
            scope === option.value
              ? 'bg-accent font-semibold text-on-accent'
              : 'bg-subtle text-ink-2 hover:text-ink',
          )}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  )
}
