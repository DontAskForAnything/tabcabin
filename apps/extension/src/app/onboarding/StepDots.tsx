import { cn } from '@tabcabin/ui'
import { useT } from '@/i18n'

/** Where the user is in the welcome dialog. */
export function StepDots({ step, total }: { step: number; total: number }) {
  const t = useT()
  return (
    <div
      role="img"
      aria-label={t('onboarding.step', { n: step + 1, total })}
      className="mr-auto flex items-center gap-1.5"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1.5 rounded-full transition-[width,background-color] duration-200',
            index === step ? 'w-5 bg-accent' : 'w-1.5 bg-ink-4/60',
          )}
        />
      ))}
    </div>
  )
}
