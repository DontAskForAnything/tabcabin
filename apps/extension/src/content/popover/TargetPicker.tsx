import { ChevronDown, Plus } from 'lucide-react'
import { displayHost, INBOX_EMOJI, INBOX_ID } from '@tabcabin/core'
import { cn } from '@tabcabin/ui'
import { useState } from 'react'
import type { PopoverData } from '@/background/popover'
import type { Translate } from '@/i18n'
import { targetLabel } from './targetLabel'
import type { PageInfo, Target } from './types'

type Workspace = PopoverData['workspaces'][number]

/** "Save to": the chosen group, and a list of every group (or a new one) to pick from. */
export function TargetPicker({
  data,
  page,
  workspace,
  target,
  onWorkspace,
  onTarget,
  t,
}: {
  data: PopoverData | null
  page: PageInfo
  workspace: Workspace | undefined
  target: Target | null
  onWorkspace: (id: string) => void
  onTarget: (target: Target) => void
  t: Translate
}) {
  const [open, setOpen] = useState(false)
  const choose = (next: Target) => {
    onTarget(next)
    setOpen(false)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-ink-3">{t('tab.saveTo')}</span>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-[11px] bg-subtle px-3 text-left text-[13.5px] font-medium"
      >
        <span className="min-w-0 flex-1 truncate">{targetLabel(data, target, t)}</span>
        <ChevronDown
          size={14}
          className={cn('text-ink-3 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && data && (
        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-line p-1.5">
          <button
            type="button"
            onClick={() => choose({ groupId: INBOX_ID })}
            className={cn(
              'mb-1 flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] hover:bg-subtle',
              target &&
                'groupId' in target &&
                target.groupId === INBOX_ID &&
                'bg-accent-soft font-semibold text-accent-ink',
            )}
          >
            <span>{INBOX_EMOJI}</span>
            <span className="truncate">{t('inbox.title')}</span>
            <span className="ml-auto truncate text-[11.5px] font-normal text-ink-4">
              {t('inbox.sortLater')}
            </span>
          </button>
          {data.workspaces.length > 1 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {data.workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onWorkspace(ws.id)}
                  className={cn(
                    'h-7 rounded-lg px-2 text-[12px] font-semibold',
                    ws.id === workspace?.id ? 'bg-accent text-on-accent' : 'bg-subtle text-ink-2',
                  )}
                >
                  {ws.emoji} {ws.name}
                </button>
              ))}
            </div>
          )}
          {workspace?.categories.map((cat) => (
            <div key={cat.id}>
              <div className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.05em] text-ink-3 uppercase">
                {cat.name}
              </div>
              {cat.groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => choose({ groupId: group.id })}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] hover:bg-subtle',
                    target &&
                      'groupId' in target &&
                      target.groupId === group.id &&
                      'bg-accent-soft font-semibold text-accent-ink',
                  )}
                >
                  <span>{group.emoji}</span>
                  <span className="truncate">{group.title || t('group.untitled')}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  choose({ newGroupIn: cat.id, title: displayHost(page.url) || page.title })
                }
                className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] text-ink-3 hover:bg-subtle"
              >
                <Plus size={13} />
                {t('tab.saveToNew')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
