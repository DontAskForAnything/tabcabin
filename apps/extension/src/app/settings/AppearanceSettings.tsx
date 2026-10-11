import { Monitor, Moon, Sun } from 'lucide-react'
import { SegmentedControl, type ThemePreference } from '@tabcabin/ui'
import { useT } from '@/i18n'
import {
  DEFAULT_SETTINGS,
  type Density,
  type SidebarMode,
  updateSettings,
} from '@/settings/settings'
import type { ActiveContext } from '../useActive'
import { Row, SwitchRow } from './Row'

export function AppearanceSettings({ active }: { active: ActiveContext }) {
  const t = useT()
  const settings = active.settings ?? DEFAULT_SETTINGS
  return (
    <>
      <Row label={t('settings.theme')}>
        <SegmentedControl<ThemePreference>
          label={t('settings.theme')}
          value={settings.theme}
          onValueChange={(theme) => void updateSettings({ theme })}
          options={[
            { value: 'light', label: t('menu.themeLight'), icon: <Sun size={14} /> },
            { value: 'dark', label: t('menu.themeDark'), icon: <Moon size={14} /> },
            { value: 'system', label: t('menu.themeSystem'), icon: <Monitor size={14} /> },
          ]}
        />
      </Row>
      <Row label={t('settings.density')} hint={t('settings.densityHint')}>
        <SegmentedControl<Density>
          label={t('settings.density')}
          value={settings.density}
          onValueChange={(density) => void updateSettings({ density })}
          options={[
            { value: 'comfortable', label: t('settings.densityComfortable') },
            { value: 'compact', label: t('settings.densityCompact') },
          ]}
        />
      </Row>
      <Row label={t('settings.sidebarMode')} hint={t('settings.sidebarModeHint')}>
        <SegmentedControl<SidebarMode>
          label={t('settings.sidebarMode')}
          value={settings.sidebarMode}
          onValueChange={(sidebarMode) => void updateSettings({ sidebarMode })}
          options={[
            { value: 'pinned', label: t('settings.sidebarPinned') },
            { value: 'rail', label: t('settings.sidebarRail') },
          ]}
        />
      </Row>
      <SwitchRow
        label={t('settings.showUrls')}
        checked={settings.showUrls}
        onChange={(showUrls) => void updateSettings({ showUrls })}
      />
      <SwitchRow
        label={t('settings.showGroupEmoji')}
        checked={settings.showGroupEmoji}
        onChange={(showGroupEmoji) => void updateSettings({ showGroupEmoji })}
      />
    </>
  )
}
