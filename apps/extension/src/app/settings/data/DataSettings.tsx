import type { ActiveContext } from '../../useActive'
import { BrowserImportRows } from './BrowserImportRows'
import { ExportSection } from './ExportSection'
import { ImportFileRow } from './ImportFileRow'
import { StorageRows } from './StorageRows'

/** Settings tab: export, import and the data stored in this browser. */
export function DataSettings({ active }: { active: ActiveContext }) {
  return (
    <>
      <ExportSection active={active} />
      <ImportFileRow />
      <BrowserImportRows active={active} />
      <StorageRows />
    </>
  )
}
