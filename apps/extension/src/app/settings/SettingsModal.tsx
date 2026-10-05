import { Cloud, Database, Keyboard, Palette, SlidersHorizontal, X } from 'lucide-react'
import { IconButton, Modal, Tabs } from '@tabhangar/ui'
import { useRef, type ReactNode } from 'react'
import { CabinMark } from '@/app/shared/CabinMark'
import { useT } from '@/i18n'
import { extensionUrl } from '@/lib/browser'
import { type SettingsTab, useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { AccountSettings } from './account/AccountSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { DataSettings } from './data/DataSettings'
import { GeneralSettings } from './GeneralSettings'
import { ShortcutSettings } from './ShortcutSettings'

const TABS: { value: SettingsTab; icon: ReactNode }[] = [
  { value: 'general', icon: <SlidersHorizontal size={16} /> },
  { value: 'appearance', icon: <Palette size={16} /> },
  { value: 'shortcuts', icon: <Keyboard size={16} /> },
  { value: 'data', icon: <Database size={16} /> },
  { value: 'account', icon: <Cloud size={16} /> },
]

export function SettingsModal({ active }: { active: ActiveContext }) {
  const t = useT()
  const modal = useUi((s) => s.modal)
  const openModal = useUi((s) => s.openModal)
  const close = useUi((s) => s.closeModal)
  const open = modal?.type === 'settings'
  const tab: SettingsTab = (open && modal.tab) || 'general'
  // A shortcut being recorded swallows Escape instead of closing the dialog.
  const recording = useRef(false)
  const version = typeof browser !== 'undefined' ? browser.runtime.getManifest?.().version : ''

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('settings.title')}
      hideTitle
      size="lg"
      onEscapeKeyDown={(event) => {
        if (recording.current) event.preventDefault()
      }}
    >
      <Tabs.Root
        value={tab}
        onValueChange={(value) => openModal({ type: 'settings', tab: value as SettingsTab })}
        orientation="vertical"
        className="flex h-[min(640px,80vh)]"
      >
        <div className="flex w-[208px] shrink-0 flex-col border-r border-line bg-subtle/60 p-3">
          <h2 className="px-3 pt-2.5 pb-4 text-[19px] font-semibold tracking-[-0.02em]">
            {t('settings.title')}
          </h2>
          <Tabs.List aria-label={t('settings.title')} className="flex flex-col gap-0.5">
            {TABS.map(({ value, icon }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="flex h-10 items-center gap-2.5 rounded-[11px] px-3 text-left text-[13.5px] font-medium text-ink-2 transition-colors outline-none hover:bg-subtle hover:text-ink focus-visible:shadow-[0_0_0_2px_var(--focus)] data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-ink data-[state=active]:shadow-tile"
              >
                <span className="text-ink-3">{icon}</span>
                {t(`settings.tab.${value}`)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <div className="flex-1" />
          {version && (
            <div className="flex items-center gap-2.5 px-3 pb-1 text-[12px] text-ink-3">
              <CabinMark size={28} />
              <div className="flex flex-col gap-0.5">
                <p>{t('settings.version', { version })}</p>
                <a
                  href={extensionUrl('/third-party-licenses.txt')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit rounded-sm underline-offset-2 outline-none hover:text-ink-2 hover:underline focus-visible:shadow-[0_0_0_2px_var(--focus)]"
                >
                  {t('settings.licenses')}
                </a>
              </div>
            </div>
          )}
        </div>
        <div className="relative min-w-0 flex-1 overflow-y-auto px-8 pt-7 pb-8">
          <IconButton
            label={t('common.close')}
            icon={<X size={18} />}
            tooltip={false}
            className="absolute top-4 right-4"
            onClick={close}
          />
          <Tabs.Content value="general" className="outline-none">
            <GeneralSettings active={active} />
          </Tabs.Content>
          <Tabs.Content value="appearance" className="outline-none">
            <AppearanceSettings active={active} />
          </Tabs.Content>
          <Tabs.Content value="shortcuts" className="outline-none">
            <ShortcutSettings active={active} recording={recording} />
          </Tabs.Content>
          <Tabs.Content value="data" className="outline-none">
            <DataSettings active={active} />
          </Tabs.Content>
          <Tabs.Content value="account" className="outline-none">
            <AccountSettings />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Modal>
  )
}
