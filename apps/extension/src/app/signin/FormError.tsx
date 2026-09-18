import type { ReactNode } from 'react'

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[13px] leading-snug font-medium text-danger">
      {children}
    </p>
  )
}
