import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { CategoriesManager } from './CategoriesManager'
import { ConfirmHost } from './ConfirmHost'
import { LinkEditor } from './LinkEditor'
import { WorkspacePicker } from './WorkspacePicker'

export function Modals({ active }: { active: ActiveContext }) {
  const modal = useUi((s) => s.modal)
  return (
    <>
      <LinkEditor itemId={modal?.type === 'linkEditor' ? modal.itemId : null} />
      <CategoriesManager open={modal?.type === 'categories'} active={active} />
      <WorkspacePicker open={modal?.type === 'workspaces'} active={active} />
      <ConfirmHost />
    </>
  )
}
