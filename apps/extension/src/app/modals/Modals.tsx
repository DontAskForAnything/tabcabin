import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { CategoriesManager } from './CategoriesManager'
import { ConfirmHost } from './ConfirmHost'
import { LinkEditor } from './LinkEditor'
import { WorkspacePicker } from './WorkspacePicker'
import { SearchPalette } from '../search/SearchPalette'
import { ReminderEditor } from '../reminders/ReminderEditor'
import { RemindersModal } from '../reminders/RemindersModal'
import { SettingsModal } from '../settings/SettingsModal'
import { BinModal } from './BinModal'
import { BookmarkImportModal } from './BookmarkImportModal'

export function Modals({ active }: { active: ActiveContext }) {
  const modal = useUi((s) => s.modal)
  const reminderItemId = useUi((s) => s.reminderItemId)
  return (
    <>
      <LinkEditor itemId={modal?.type === 'linkEditor' ? modal.itemId : null} />
      <CategoriesManager open={modal?.type === 'categories'} active={active} />
      <WorkspacePicker open={modal?.type === 'workspaces'} active={active} />
      <SearchPalette open={modal?.type === 'search'} active={active} />
      <RemindersModal open={modal?.type === 'reminders'} active={active} />
      <BinModal open={modal?.type === 'bin'} active={active} />
      <SettingsModal active={active} />
      <BookmarkImportModal open={modal?.type === 'bookmarks'} active={active} />
      <ReminderEditor itemId={reminderItemId} settings={active.settings} />
      <ConfirmHost />
    </>
  )
}
