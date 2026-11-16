import { useMemo } from 'react'
import { useUi } from '@/state/ui'
import { useTagList } from './TagsContext'

/** The tags the board is filtered by (removed tags drop out of the filter). */
export function useTagFilter(): Set<string> {
  const chosen = useUi((s) => s.tagFilter)
  const { byId } = useTagList()
  return useMemo(() => new Set(chosen.filter((id) => byId.has(id))), [chosen, byId])
}
