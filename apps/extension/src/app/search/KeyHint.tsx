import { Kbd } from '@tabcabin/ui'
import type { ReactNode } from 'react'

export function KeyHint({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <Kbd key={key} className="bg-card">
          {key}
        </Kbd>
      ))}
      {children}
    </span>
  )
}
