import type { ReactNode } from 'react'

export function ReminderSection({
  title,
  count,
  actions,
  children,
}: {
  title: string
  count: number
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center gap-2">
        <h3 className="text-[12px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          {title}
        </h3>
        <span className="rounded-md bg-subtle-2 px-1.5 text-[11.5px] font-semibold text-ink-2">
          {count}
        </span>
        <div className="flex-1" />
        {actions}
      </div>
      {children}
    </section>
  )
}
