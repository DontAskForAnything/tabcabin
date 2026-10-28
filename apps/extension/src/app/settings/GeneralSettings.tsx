import { SegmentedControl } from '@tabcabin/ui'
import { type Locale, useT } from '@/i18n'
import { DEFAULT_SETTINGS, type OpenGroupIn, updateSettings } from '@/settings/settings'
import type { ActiveContext } from '../useActive'
import { LinkChecksRow } from './LinkChecksRow'
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
      <Row label={t('settings.openGroupIn')} hint={t('settings.openGroupInHint')}>
        <SegmentedControl<OpenGroupIn>
          label={t('settings.openGroupIn')}
          value={settings.openGroupIn}
          onValueChange={(openGroupIn) => void updateSettings({ openGroupIn })}
          options={[
            { value: 'window', label: t('settings.openGroupWindow') },
            { value: 'here', label: t('settings.openGroupHere') },
          ]}
        />
      </Row>
      <SwitchRow
        label={t('settings.closeTabOnSave')}
        hint={t('settings.closeTabOnSaveHint')}
        checked={settings.closeTabOnSave}
        onChange={(closeTabOnSave) => void updateSettings({ closeTabOnSave })}
      />
      <SwitchRow
        label={t('settings.warnDuplicates')}
        hint={t('settings.warnDuplicatesHint')}
        checked={settings.warnDuplicates}
        onChange={(warnDuplicates) => void updateSettings({ warnDuplicates })}
      />
      <LinkChecksRow settings={settings} />
      <SwitchRow
        label={t('settings.trashZone')}
        hint={t('settings.trashZoneHint')}
        checked={settings.trashZone}
        onChange={(trashZone) => void updateSettings({ trashZone })}
      />
    </>
  )
}
