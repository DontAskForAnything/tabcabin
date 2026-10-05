import { Check } from 'lucide-react'
import { cn } from '@tabhangar/ui'
import type { ReactNode } from 'react'

/* Static, decorative pieces of a board for the sign-in page (not the real board components). */

export function PreviewCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'absolute rounded-[18px] bg-white p-4 text-[#0f1110] shadow-[0_24px_50px_-18px_rgb(4_20_14/0.6)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHead({ emoji, title, meta }: { emoji: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[26px] leading-none">{emoji}</span>
      <span>
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[11.5px] text-[#5d635f]">{meta}</span>
      </span>
    </div>
  )
}

export function PreviewLink({
  letter,
  color,
  title,
}: {
  letter: string
  color: string
  title: string
}) {
  return (
    <div className="mt-3 flex items-center gap-2.5 text-[13px] font-medium">
      <span
        className="flex size-7 items-center justify-center rounded-lg text-[12px] font-bold text-white"
        style={{ background: color }}
      >
        {letter}
      </span>
      {title}
    </div>
  )
}

export function PreviewTask({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div className="mt-2.5 flex items-center gap-2.5 text-[13px]">
      <span
        className={cn(
          'flex size-[18px] items-center justify-center rounded-[5px] border',
          done ? 'border-[#1f4a3a] bg-[#1f4a3a] text-[#faf6ee]' : 'border-[#a3a79f]',
        )}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </span>
      <span className={done ? 'text-[#5d635f] line-through' : ''}>{text}</span>
    </div>
  )
}
