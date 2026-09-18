import { Check } from 'lucide-react'
import { cn } from '@tabhangar/ui'
import type { ReactNode } from 'react'

/* Static, decorative pieces of a board for the sign-in page (not the real board components). */

export function PreviewCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'absolute rounded-[18px] bg-white p-4 text-[#1c1d22] shadow-[0_24px_50px_-18px_rgb(10_5_40/0.55)]',
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
        <span className="block text-[11.5px] text-[#6b6f7a]">{meta}</span>
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
          done ? 'border-[#5b4be0] bg-[#5b4be0] text-white' : 'border-[#c9ccd4]',
        )}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </span>
      <span className={done ? 'text-[#8b8f99] line-through' : ''}>{text}</span>
    </div>
  )
}
