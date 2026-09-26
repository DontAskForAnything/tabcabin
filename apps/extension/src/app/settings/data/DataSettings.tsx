import { useT } from '@/i18n'
import type { ActiveContext } from '../../useActive'
import { SectionTitle } from '../Row'
import { BrowserImportRows } from './BrowserImportRows'
import { ExportSection } from './ExportSection'
import { ImportFileRow } from './ImportFileRow'
import { StorageRows } from './StorageRows'

/** Settings tab: export, import and the data stored in this browser. */
export function DataSettings({ active }: { active: ActiveContext }) {
  const t = useT()
  return (
    <>
      <SectionTitle>{t('settings.tab.data')}</SectionTitle>
      <ExportSection active={active} />
      <ImportFileRow />
      <BrowserImportRows active={active} />
      <StorageRows />
    </>
  )
}
