import { useMemo } from 'react'
import type { BoardItem } from '@/db/hooks'
import { useJustDone } from './justDone'
import { splitDone } from './splitDone'

/** A group's items, with its finished to-dos folded away (see `splitDone`). */
export function useDoneSplit(items: BoardItem[]) {
  const phases = useJustDone((s) => s.phases)
  return useMemo(() => splitDone(items, phases), [items, phases])
}
