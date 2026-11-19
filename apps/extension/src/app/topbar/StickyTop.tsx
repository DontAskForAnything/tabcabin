import { cn } from '@tabcabin/ui'
import { type ReactNode, useEffect, useRef, useState } from 'react'

/**
 * Keeps the top bar (and the tag filter under it) in view while the page scrolls. Items brought
 * into view are scrolled clear of it.
 */
export function StickyTop({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.scrollPaddingTop = `${node.offsetHeight}px`
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.scrollPaddingTop = ''
    }
  }, [])

  return (
    <div
      ref={ref}
      data-top-bar
      data-scrolled={scrolled || undefined}
      className={cn(
        'sticky top-0 z-30 bg-canvas transition-shadow',
        scrolled && 'shadow-[0_1px_0_var(--line)]',
      )}
    >
      {children}
    </div>
  )
}
