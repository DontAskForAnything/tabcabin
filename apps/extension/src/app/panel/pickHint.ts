import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

/**
 * Dragging a single open tab says that Shift-click picks more, until several tabs have been
 * picked once in this browser.
 */
const PICKED_KEY = 'panel.pickedTabs'

let remembered = false

/** Several tabs were picked: the hint has done its job. */
export async function rememberPicking() {
  if (remembered) return
  remembered = true
  if (!(await db.meta.get(PICKED_KEY))) await db.meta.put({ key: PICKED_KEY, value: true })
}

/** Whether a single dragged tab still shows the hint (false while it loads). */
export function usePickHint(): boolean {
  return useLiveQuery(async () => !(await db.meta.get(PICKED_KEY)), []) ?? false
}
