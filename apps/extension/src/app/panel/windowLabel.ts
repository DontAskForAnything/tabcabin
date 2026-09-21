import type { Translate } from '@/i18n'
import type { PanelData } from './usePanelData'

/** "This window" or "Window 2". */
export function windowLabel(id: number, data: PanelData, t: Translate): string {
  return id === data.currentWindowId
    ? t('panel.thisWindow')
    : t('panel.windowN', { n: data.windowIds.indexOf(id) + 1 })
}
