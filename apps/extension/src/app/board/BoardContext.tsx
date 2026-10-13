import { createContext, useContext } from 'react'
import type { BoardActions } from './actions'
import type { GroupOption } from './ItemContextMenu'

export interface BoardContextValue {
  groups: GroupOption[]
  actions: BoardActions
  /** Addresses (normalized) that did not load when link checks last looked. */
  broken: Set<string>
}

export const BoardContext = createContext<BoardContextValue | null>(null)

export const useBoardContext = () => useContext(BoardContext)
