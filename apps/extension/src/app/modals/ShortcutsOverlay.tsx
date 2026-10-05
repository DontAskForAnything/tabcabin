import { Button, Kbd, Modal } from '@tabcabin/ui'
import { Fragment } from 'react'
import { useT } from '@/i18n'
import { formatShortcut } from '@/lib/keys'
import { DEFAULT_SETTINGS } from '@/settings/settings'
import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'

type Entry = { label: string; keys: string[][] }

/** Cheat sheet opened with `?`. */
export function ShortcutsOverlay({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const openModal = useUi((s) => s.openModal)
  const shortcuts = active.settings?.shortcuts ?? DEFAULT_SETTINGS.shortcuts
  const key = (shortcut: string) => [formatShortcut(shortcut)]

  const sections: { title: string; entries: Entry[] }[] = [
    {
      title: t('shortcuts.general'),
      entries: [
        { label: t('settings.shortcut.search'), keys: [key(shortcuts.search)] },
        { label: t('settings.shortcut.workspaces'), keys: [key(shortcuts.workspaces)] },
        { label: t('settings.shortcut.newGroup'), keys: [key(shortcuts.newGroup)] },
        { label: t('settings.shortcut.bin'), keys: [key(shortcuts.bin)] },
        { label: t('settings.fixed.categories'), keys: [['1 – 9']] },
        { label: t('settings.fixed.undo'), keys: [key('mod+z')] },
        { label: t('settings.fixed.filterTabs'), keys: [['/']] },
        { label: t('settings.fixed.help'), keys: [['?']] },
        { label: t('shortcuts.closeDialog'), keys: [['Esc']] },
      ],
    },
    {
      title: t('shortcuts.board'),
      entries: [
        {
          label: t('settings.fixed.select'),
          keys: [[formatShortcut('shift'), t('settings.click')]],
        },
        { label: t('shortcuts.clearSelection'), keys: [['Esc']] },
        { label: t('settings.fixed.newNote'), keys: [['Enter', 'Enter']] },
        { label: t('shortcuts.newLine'), keys: [[formatShortcut('shift'), 'Enter']] },
        { label: t('shortcuts.deleteNote'), keys: [[formatShortcut('shift'), 'Delete']] },
        { label: t('shortcuts.finishNote'), keys: [['Esc']] },
      ],
    },
    {
      title: t('shortcuts.search'),
      entries: [
        { label: t('shortcuts.navigate'), keys: [['↑', '↓']] },
        { label: t('shortcuts.openResult'), keys: [['Enter']] },
        { label: t('settings.fixed.revealSearch'), keys: [key('mod+enter')] },
        { label: t('shortcuts.nextScope'), keys: [['Tab']] },
      ],
    },
  ]

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('menu.shortcuts')}
      size="lg"
      footer={
        <Button variant="ghost" onClick={() => openModal({ type: 'settings', tab: 'shortcuts' })}>
          {t('shortcuts.customize')}
        </Button>
      }
    >
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <h3 className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
              {section.title}
            </h3>
            <dl>
              {section.entries.map((entry) => (
                <div
                  key={entry.label}
                  className="flex items-center gap-3 border-b border-line py-2 text-[13.5px] last:border-b-0"
                >
                  <dt className="flex-1 text-ink-2">{entry.label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {entry.keys.map((combo, i) => (
                      <Fragment key={i}>
                        {combo.map((part, j) => (
                          <Kbd key={j} className="h-6 min-w-6 px-1.5 text-[12px]">
                            {part}
                          </Kbd>
                        ))}
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
