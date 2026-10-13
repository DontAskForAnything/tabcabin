import { cn, IconButton, Kbd } from '@tabcabin/ui'
import { ArrowLeft, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { KeyHint } from './KeyHint'
import type { GroupTarget } from './useGroupTargets'

const matches = (target: GroupTarget, query: string) => {
  const q = query.trim().toLowerCase()
  return !q || `${target.label} ${target.place}`.toLowerCase().includes(q)
}

/** The second step of a search action: which group the tab, item or note goes to. */
export function GroupPicker({
  heading,
  targets,
  onPick,
  onBack,
}: {
  heading: string
  targets: GroupTarget[]
  onPick: (target: GroupTarget) => void
  onBack: () => void
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const shown = targets.filter((target) => matches(target, query))
  const selected = shown[Math.min(index, shown.length - 1)]

  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  return (
    <div
      className="flex max-h-[76vh] flex-col"
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const delta = event.key === 'ArrowDown' ? 1 : -1
          setIndex((value) => (shown.length ? (value + delta + shown.length) % shown.length : 0))
        } else if (event.key === 'Enter' && selected) {
          event.preventDefault()
          onPick(selected)
        } else if (event.key === 'Backspace' && !query) {
          event.preventDefault()
          onBack()
        }
      }}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 pt-3 pb-2.5">
        <IconButton
          label={t('onboarding.back')}
          icon={<ArrowLeft size={17} />}
          size="sm"
          onClick={onBack}
        />
        <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink-2">{heading}</span>
      </div>
      <label className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Search size={18} className="shrink-0 text-accent" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('search.findGroup')}
          aria-label={t('search.findGroup')}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
        />
      </label>
      <div
        ref={listRef}
        role="listbox"
        aria-label={heading}
        className="min-h-[120px] flex-1 overflow-y-auto px-2.5 py-2"
      >
        {shown.map((target) => (
          <button
            key={target.id}
            type="button"
            role="option"
            aria-selected={target === selected}
            data-selected={target === selected}
            onMouseMove={() => setIndex(shown.indexOf(target))}
            onClick={() => onPick(target)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px]',
              target === selected && 'bg-accent-soft',
            )}
          >
            <span className="min-w-0 flex-1 truncate font-[550]">{target.label}</span>
            {target.place && (
              <span className="shrink-0 text-[12.5px] text-ink-3">{target.place}</span>
            )}
            {target === selected && <Kbd className="bg-card">↵</Kbd>}
          </button>
        ))}
        {shown.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-ink-3">
            {t('search.noResults', { query })}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-line bg-subtle/70 px-5 py-3 text-[12px] text-ink-3">
        <KeyHint keys={['↑', '↓']}>{t('search.hintSelect')}</KeyHint>
        <KeyHint keys={['↵']}>{t('search.hintPick')}</KeyHint>
        <KeyHint keys={['Esc']}>{t('search.hintBack')}</KeyHint>
      </div>
    </div>
  )
}
