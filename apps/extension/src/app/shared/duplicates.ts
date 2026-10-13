import type { ToastOptions } from '@tabcabin/ui'
import { type SavedPlace, savedElsewhere } from '@/db/duplicates'
import type { Translate } from '@/i18n'
import type { Settings } from '@/settings/settings'
import { useUi } from '@/state/ui'
import { revealItem } from '../useActive'

/** Links among `urls` saved in another group than `groupId`, unless the warning is turned off. */
export async function findDuplicates(
  urls: readonly string[],
  groupId: string,
  settings: Settings | undefined,
): Promise<SavedPlace[]> {
  if (settings?.warnDuplicates === false) return []
  return savedElsewhere(urls, groupId)
}

/** The line a toast adds about duplicates, with "Show" when there is a single one. */
export function duplicateNote(
  places: readonly SavedPlace[],
  t: Translate,
  settings: Settings | undefined,
): Pick<ToastOptions, 'description' | 'action'> {
  const [place] = places
  if (!place) return {}
  if (places.length > 1) return { description: t('duplicate.many', { count: places.length }) }
  return {
    description: t('duplicate.alsoIn', { place: place.label }),
    action: { label: t('duplicate.show'), onClick: () => void showPlace(place, settings) },
  }
}

async function showPlace(place: SavedPlace, settings: Settings | undefined) {
  if (place.workspaceId && place.categoryId && settings)
    await revealItem(settings, {
      workspaceId: place.workspaceId,
      categoryId: place.categoryId,
      itemId: place.itemId,
    })
  // The Inbox is on every board.
  else useUi.getState().flashItem(place.itemId)
}
