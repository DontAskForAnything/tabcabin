import { cn } from '../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-shimmer rounded-lg bg-subtle-2', className)} />
}
