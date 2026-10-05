import { Button, cn, Kbd } from '@tabcabin/ui'
import { type KeyboardEvent, type RefObject, useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { formatShortcut, shortcutFromEvent } from '@/lib/keys'
import { DEFAULT_SETTINGS, type Shortcuts, updateSettings } from '@/settings/settings'
import type { ActiveContext } from '../useActive'
import { Row, SectionTitle } from './Row'

const ACTIONS: (keyof Shortcuts)[] = ['newGroup', 'search', 'workspaces', 'bin']

export function ShortcutSettings({
  active,
  recording,
}: {
  active: ActiveContext
  recording: RefObject<boolean>
}) {
  const t = useT()
  const shortcuts = active.settings?.shortcuts ?? DEFAULT_SETTINGS.shortcuts
  const [editing, setEditing] = useState<keyof Shortcuts | null>(null)
  const [error, setError] = useState<{ action: keyof Shortcuts; message: string } | null>(null)
  const [saveShortcut, setSaveShortcut] = useState('')

  useEffect(() => {
    recording.current = editing !== null
  }, [editing, recording])
  useEffect(() => {
    if (typeof browser === 'undefined' || !browser.commands) return
    void browser.commands
      .getAll()
      .then((commands) =>
        setSaveShortcut(commands.find((c) => c.name === '_execute_action')?.shortcut ?? ''),
      )
  }, [])

  const record = (action: keyof Shortcuts, event: KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
    if (event.key === 'Escape' && plain) {
      setEditing(null)
      setError(null)
      return
    }
    const shortcut = shortcutFromEvent(event.nativeEvent)
    if (!shortcut) return
    const taken = ACTIONS.find((other) => other !== action && shortcuts[other] === shortcut)
    if (taken) {
      setError({
        action,
        message: t('settings.shortcutTaken', { action: t(`settings.shortcut.${taken}`) }),
      })
      return
    }
    setError(null)
    setEditing(null)
    void updateSettings({ shortcuts: { ...shortcuts, [action]: shortcut } })
  }

  const fixed: { label: string; keys: string[]; action?: () => void }[] = [
    {
      label: t('settings.fixed.popover'),
      keys: saveShortcut ? [saveShortcut] : ['—'],
      action: () => void browser.tabs.create({ url: 'chrome://extensions/shortcuts' }),
    },
    { label: t('settings.fixed.help'), keys: ['?'] },
    { label: t('settings.fixed.filterTabs'), keys: ['/'] },
    { label: t('settings.fixed.categories'), keys: ['1 – 9'] },
    { label: t('settings.fixed.undo'), keys: [formatShortcut('mod+z')] },
    { label: t('settings.fixed.newNote'), keys: ['Enter', 'Enter'] },
    {
      label: t('settings.fixed.select'),
      keys: [`${formatShortcut('shift')} + ${t('settings.click')}`],
    },
    { label: t('settings.fixed.revealSearch'), keys: [formatShortcut('mod+enter')] },
  ]

  return (
    <>
      <SectionTitle>{t('settings.tab.shortcuts')}</SectionTitle>
      <p className="mb-2 text-[13px] text-ink-3">{t('settings.shortcutsHint')}</p>
      {ACTIONS.map((action) => {
        const label = t(`settings.shortcut.${action}`)
        const isEditing = editing === action
        const failed = error?.action === action ? error.message : undefined
        return (
          <Row
            key={action}
            label={label}
            hint={failed && <span className="font-medium text-danger">{failed}</span>}
          >
            <button
              type="button"
              aria-label={`${label}: ${formatShortcut(shortcuts[action])}`}
              aria-pressed={isEditing}
              onClick={() => {
                setError(null)
                setEditing(isEditing ? null : action)
              }}
              onKeyDown={isEditing ? (event) => record(action, event) : undefined}
              onBlur={() => {
                if (isEditing) setEditing(null)
              }}
              className={cn(
                'flex h-9 min-w-[132px] items-center justify-center rounded-[10px] border px-3 text-[13px] transition-[border-color,box-shadow] outline-none',
                isEditing
                  ? 'border-accent bg-accent-soft font-semibold text-accent-ink shadow-[0_0_0_3px_var(--accent-soft)]'
                  : 'border-line bg-card shadow-tile hover:border-accent/40',
                failed && 'border-danger',
              )}
            >
              {isEditing ? (
                t('settings.pressKeys')
              ) : (
                <Kbd className="h-6 bg-subtle-2 px-2 text-[12px] text-ink-2">
                  {formatShortcut(shortcuts[action])}
                </Kbd>
              )}
            </button>
          </Row>
        )
      })}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setError(null)
            void updateSettings({ shortcuts: DEFAULT_SETTINGS.shortcuts })
          }}
        >
          {t('settings.resetShortcuts')}
        </Button>
      </div>

      <h4 className="mt-6 mb-1 text-[12px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        {t('settings.otherShortcuts')}
      </h4>
      <ul>
        {fixed.map((entry) => (
          <li
            key={entry.label}
            className="flex items-center gap-3 border-b border-line py-2.5 text-[13.5px] last:border-b-0"
          >
            <span className="flex-1 text-ink-2">{entry.label}</span>
            {entry.action && (
              <button
                type="button"
                onClick={entry.action}
                className="text-[12.5px] font-medium text-accent-ink hover:underline"
              >
                {t('settings.changeInChrome')}
              </button>
            )}
            <span className="flex gap-1">
              {entry.keys.map((key, i) => (
                <Kbd key={i} className="h-6 px-2 text-[12px]">
                  {key}
                </Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
