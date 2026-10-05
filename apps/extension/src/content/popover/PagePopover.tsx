import { type NoteColor, presetTime, type TimePreset } from '@tabhangar/core'
import { Checkbox, cn } from '@tabhangar/ui'
import { useEffect, useRef, useState } from 'react'
import type { MessageKey } from '@/i18n'
import { translate } from '@/i18n/translate'
import type { PopoverSaveRequest } from '@/messages'
import { AlreadySaved } from './AlreadySaved'
import { NoteFields } from './NoteFields'
import { PageSummary } from './PageSummary'
import { PopoverHeader } from './PopoverHeader'
import { ReminderPresets } from './ReminderPresets'
import { SavedMessage } from './SavedMessage'
import { TargetPicker } from './TargetPicker'
import type { PageInfo } from './types'
import { useDraggable } from './useDraggable'
import { usePopoverData } from './usePopoverData'

/** Saves the current page with a note, a group and a reminder (Ctrl+Shift+S on any page). */
export function PagePopover({ page, onClose }: { page: PageInfo; onClose: () => void }) {
  const { data, workspace, setWorkspaceId, target, setTarget } = usePopoverData(page)
  const draggable = useDraggable()
  const [note, setNote] = useState('')
  const [color, setColor] = useState<NoteColor | null>(null)
  const [todo, setTodo] = useState(false)
  const [remind, setRemind] = useState<TimePreset | null>(null)
  const [closeTab, setCloseTab] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedTo, setSavedTo] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => textarea.current?.focus(), [])

  // The page's own language and theme don't matter: the popover follows TabHangar's.
  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    translate(data?.locale ?? 'en', key, params)
  const dark =
    data?.theme === 'dark' ||
    (data?.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  const save = async () => {
    if (!target || status === 'saving') return
    setStatus('saving')
    const request: PopoverSaveRequest = {
      type: 'tabhangar:popover-save',
      page,
      target,
      note: note.trim() ? { text: note, color, todo } : null,
      remindAt: remind ? presetTime(remind, Date.now()) : null,
      closeTab,
    }
    const response = (await browser.runtime.sendMessage(request)) as {
      ok: boolean
      groupTitle?: string
    }
    if (!response?.ok) {
      setStatus('error')
      return
    }
    setSavedTo(response.groupTitle ?? '')
    setStatus('saved')
    setTimeout(onClose, 1400)
  }

  return (
    <div className={cn('font-sans', dark && 'dark')}>
      <div
        role="dialog"
        aria-label="TabHangar"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void save()
        }}
        style={draggable.style}
        className="pointer-events-auto fixed top-6 right-6 w-[372px] overflow-hidden rounded-[20px] bg-card text-[14px] text-ink shadow-pop"
      >
        <PopoverHeader handle={draggable.handle} onClose={onClose} t={t} />

        <div className="flex flex-col gap-3.5 px-[18px] pt-1 pb-[18px]">
          <PageSummary page={page} />
          {data && data.savedIn.length > 0 && status === 'idle' && (
            <AlreadySaved savedIn={data.savedIn} />
          )}

          {status === 'saved' ? (
            <SavedMessage text={t('toast.saved', { group: savedTo })} />
          ) : (
            <>
              <NoteFields
                note={note}
                color={color}
                todo={todo}
                onNote={setNote}
                onColor={setColor}
                onTodo={setTodo}
                textarea={textarea}
                t={t}
              />
              <TargetPicker
                data={data}
                page={page}
                workspace={workspace}
                target={target}
                onWorkspace={setWorkspaceId}
                onTarget={setTarget}
                t={t}
              />
              <ReminderPresets value={remind} onChange={setRemind} t={t} />

              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2 select-none">
                <Checkbox
                  size="sm"
                  checked={closeTab}
                  onCheckedChange={setCloseTab}
                  label={t('popover.closeAfterSave')}
                />
                {t('popover.closeAfterSave')}
              </label>

              {status === 'error' && (
                <p className="text-[12.5px] font-medium text-danger">{t('toast.failed')}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void browser.runtime.sendMessage({ type: 'tabhangar:open-app' })}
                  className="h-[42px] flex-1 rounded-xl bg-subtle text-[13.5px] font-semibold text-ink"
                >
                  {t('menu.openApp')}
                </button>
                <button
                  type="button"
                  disabled={!target || status === 'saving'}
                  onClick={() => void save()}
                  className="h-[42px] flex-1 rounded-xl bg-accent text-[13.5px] font-semibold text-on-accent shadow-glow disabled:opacity-60"
                >
                  {t('common.save')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
