import { presetTime, TIME_PRESETS } from '@tabhangar/core'
import { cn, SegmentedControl } from '@tabhangar/ui'
import { Bell, CircleAlert } from 'lucide-react'
import { useLocale, useT } from '@/i18n'
import { formatDue, toInputs, weekdayNames } from './format'
import { type Mode, type ReminderFormState, type RepeatKind } from './useReminderForm'

const inputClass =
  'h-10 min-w-0 rounded-[11px] border border-line bg-card px-3 text-[14px] text-ink shadow-tile outline-none focus-visible:shadow-[0_0_0_2px_var(--focus)]'

export function ReminderFields({ form }: { form: ReminderFormState }) {
  const t = useT()
  const locale = useLocale()
  const days = weekdayNames(locale, 'short')

  const applyPreset = (preset: (typeof TIME_PRESETS)[number]) => {
    const next = toInputs(presetTime(preset, Date.now()))
    form.setDate(next.date)
    form.setTime(next.time)
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<Mode>
        label={t('reminders.title')}
        value={form.mode}
        onValueChange={form.setMode}
        className="grid w-full grid-cols-2 [&>button]:justify-center"
        options={[
          { value: 'once', label: t('reminders.once') },
          { value: 'repeat', label: t('reminders.repeating') },
        ]}
      />

      {form.mode === 'once' ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className="h-8 rounded-[9px] bg-subtle px-3 text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-accent-soft hover:text-accent-ink"
              >
                {t(`reminders.preset.${preset}`)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink-2">{t('reminders.date')}</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(event) => form.setDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink-2">{t('reminders.time')}</span>
              <input
                type="time"
                required
                value={form.time}
                onChange={(event) => form.setTime(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <SegmentedControl<RepeatKind>
            label={t('reminders.repeating')}
            value={form.repeat}
            onValueChange={form.setRepeat}
            className="self-start"
            options={[
              { value: 'weekly', label: t('reminders.weekly') },
              { value: 'monthly', label: t('reminders.monthly') },
            ]}
          />
          {form.repeat === 'weekly' ? (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[12.5px] font-semibold text-ink-2">
                {t('reminders.days')}
              </legend>
              <div className="flex gap-1.5">
                {days.map((name, day) => {
                  const on = form.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      aria-label={name}
                      onClick={() =>
                        form.setWeekdays(
                          on ? form.weekdays.filter((d) => d !== day) : [...form.weekdays, day],
                        )
                      }
                      className={cn(
                        'h-9 flex-1 rounded-[10px] text-[12.5px] font-semibold capitalize transition-[background,color,box-shadow] duration-150',
                        on
                          ? 'bg-accent text-on-accent shadow-glow'
                          : 'bg-subtle text-ink-2 hover:bg-subtle-2',
                      )}
                    >
                      {name.slice(0, 2)}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-ink-2">
                {t('reminders.dayOfMonth')}
              </span>
              <select
                value={form.monthDay}
                onChange={(event) => form.setMonthDay(Number(event.target.value))}
                className={cn(inputClass, 'w-[140px]')}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink-2">{t('reminders.time')}</span>
            <input
              type="time"
              required
              value={form.repeatTime}
              onChange={(event) => form.setRepeatTime(event.target.value)}
              className={cn(inputClass, 'w-[140px]')}
            />
          </label>
        </>
      )}

      <p
        role="status"
        className={cn(
          'flex items-center gap-2 rounded-[11px] px-3 py-2.5 text-[13px] font-medium',
          'error' in form.result ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-ink',
        )}
      >
        {'error' in form.result ? <CircleAlert size={15} /> : <Bell size={15} />}
        {'error' in form.result
          ? form.result.error
          : t('reminders.next', { date: formatDue(form.result.input.dueAt, locale, t) })}
      </p>
    </div>
  )
}
