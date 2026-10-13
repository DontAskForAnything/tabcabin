import { cn } from '@tabcabin/ui'
import { useId } from 'react'
import { TEMPLATES, type TemplateId } from '@/data/templates'
import { useT } from '@/i18n'

/** "Start with": an empty workspace or one of the templates, with the groups it brings. */
export function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateId | null
  onChange: (value: TemplateId | null) => void
}) {
  const t = useT()
  const labelId = useId()
  const chosen = TEMPLATES.find((template) => template.id === value)
  const chip = (selected: boolean) =>
    cn(
      'flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium transition-colors outline-none focus-visible:shadow-[0_0_0_2px_var(--focus)]',
      selected ? 'bg-accent text-on-accent' : 'bg-subtle text-ink-2 hover:bg-subtle-2',
    )
  return (
    <div className="mt-5 flex flex-col gap-2">
      <span id={labelId} className="text-[12.5px] font-semibold text-ink-3">
        {t('template.startWith')}
      </span>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={value === null}
          className={chip(value === null)}
          onClick={() => onChange(null)}
        >
          {t('template.empty')}
        </button>
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            aria-pressed={value === template.id}
            className={chip(value === template.id)}
            onClick={() => onChange(template.id)}
          >
            <span aria-hidden>{template.emoji}</span>
            {t(template.name)}
          </button>
        ))}
      </div>
      {chosen && (
        <p className="text-[12.5px] text-ink-3">
          {chosen.groups.map((group) => `${group.emoji} ${t(group.title)}`).join(' · ')}
        </p>
      )}
    </div>
  )
}
