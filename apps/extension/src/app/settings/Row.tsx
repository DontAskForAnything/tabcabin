import { Switch } from '@tabhangar/ui'
import type { ReactNode } from 'react'

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[20px] font-semibold tracking-[-0.02em]">{children}</h3>
}

/** A setting: label and hint on the left, the control on the right. */
export function Row({
  label,
  hint,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-6 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Row label={label} hint={hint}>
      <Switch checked={checked} onCheckedChange={onChange} label={label} />
    </Row>
  )
}
