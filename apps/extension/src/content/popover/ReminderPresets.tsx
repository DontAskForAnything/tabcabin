import { Bell } from 'lucide-react'
import { TIME_PRESETS, type TimePreset } from '@tabhangar/core'
import { cn } from '@tabhangar/ui'
import type { Translate } from '@/i18n'

/** Quick reminder choices; picking the selected one again clears it. */
export function ReminderPresets({
  value,
  onChange,
  t,
}: {
  value: TimePreset | null
  onChange: (preset: TimePreset | null) => void
  t: Translate
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
        <Bell size={12} />
        {t('popover.remind')}
      </span>
      <div className="flex flex-wrap gap-1">
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value === preset}
            onClick={() => onChange(value === preset ? null : preset)}
            className={cn(
              'h-7 rounded-lg px-2.5 text-[12px] font-semibold transition-colors',
              value === preset ? 'bg-accent text-on-accent' : 'bg-subtle text-ink-2 hover:text-ink',
            )}
          >
            {t(`reminders.preset.${preset}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
