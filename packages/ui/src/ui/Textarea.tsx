import { type ComponentProps, useLayoutEffect, useRef } from 'react'
import { cn } from '../lib/cn'

export interface TextareaProps extends ComponentProps<'textarea'> {
  /** Grow with the content instead of scrolling. */
  autoGrow?: boolean
}

export function Textarea({ autoGrow = true, className, value, ref, ...props }: TextareaProps) {
  const inner = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const el = inner.current
    if (!autoGrow || !el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [autoGrow, value])

  return (
    <textarea
      ref={(el) => {
        inner.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      value={value}
      rows={1}
      className={cn(
        'w-full resize-none border-0 bg-transparent text-[14px] leading-[1.5] text-inherit outline-none placeholder:text-ink-3',
        className,
      )}
      {...props}
    />
  )
}
