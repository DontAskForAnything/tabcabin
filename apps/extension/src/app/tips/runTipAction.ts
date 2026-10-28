import { updateSettings, type Settings } from '@/settings/settings'
import { useUi } from '@/state/ui'
import type { TipAction } from './catalog'

/** Shows the thing a tip talks about. */
export function runTipAction(
  action: TipAction,
  { settings, categoryId }: { settings: Settings; categoryId: string | undefined },
) {
  const { openModal } = useUi.getState()
  switch (action) {
    case 'search':
    case 'bin':
    case 'shortcuts':
      openModal({ type: action })
      return
    case 'appearance':
    case 'general':
    case 'account':
      openModal({ type: 'settings', tab: action })
      return
    case 'collections':
      if (categoryId)
        void updateSettings({ viewModes: { ...settings.viewModes, [categoryId]: 'collections' } })
      return
  }
}
