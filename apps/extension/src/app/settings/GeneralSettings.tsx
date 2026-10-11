import { SegmentedControl } from '@tabcabin/ui'
import { type Locale, useT } from '@/i18n'
import { DEFAULT_SETTINGS, updateSettings } from '@/settings/settings'
import type { ActiveContext } from '../useActive'
import { Row, SwitchRow } from './Row'

export function GeneralSettings({ active }: { active: ActiveContext }) {
  const t = useT()
  const settings = active.settings ?? DEFAULT_SETTINGS
  return (
    <>
      <Row label={t('settings.language')} hint={t('settings.languageHint')}>
        <SegmentedControl<Locale>
          label={t('settings.language')}
          value={settings.locale}
          onValueChange={(locale) => void updateSettings({ locale })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'pl', label: 'Polski' },
          ]}
        />
      </Row>
      <SwitchRow
        label={t('settings.openLinksInNewTab')}
        hint={t('settings.openLinksInNewTabHint')}
        checked={settings.openLinksInNewTab}
        onChange={(openLinksInNewTab) => void updateSettings({ openLinksInNewTab })}
      />
      <SwitchRow
        label={t('settings.focusExistingTab')}
        hint={t('settings.focusExistingTabHint')}
        checked={settings.focusExistingTab}
        onChange={(focusExistingTab) => void updateSettings({ focusExistingTab })}
      />
      <SwitchRow
        label={t('settings.closeTabOnSave')}
        hint={t('settings.closeTabOnSaveHint')}
        checked={settings.closeTabOnSave}
        onChange={(closeTabOnSave) => void updateSettings({ closeTabOnSave })}
      />
      <SwitchRow
        label={t('settings.trashZone')}
        hint={t('settings.trashZoneHint')}
        checked={settings.trashZone}
        onChange={(trashZone) => void updateSettings({ trashZone })}
      />
    </>
  )
}
