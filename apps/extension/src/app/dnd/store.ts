import { create } from 'zustand'
import type { DragSource, DropTarget } from './types'

export interface OverlayInfo {
  title: string
  subtitle?: string
  url?: string | null
  favIconUrl?: string | null
  emoji?: string
  noteColor?: string | null
  kind: 'link' | 'note' | 'image' | 'stack' | 'group' | 'tab'
  count: number
}

interface DragState {
  source: DragSource | null
  /** Kinds of what is dragged ('tab' for open tabs, 'group' for a group). */
  kinds: string[]
  overlay: OverlayInfo | null
  target: DropTarget
  /** Item the pointer rests on; becomes a combine target after a short delay. */
  pendingCombine: string | null
  /** Items just dropped: they stay faded where they were until the drop is saved. */
  settling: string[]
  set: (patch: Partial<Omit<DragState, 'set' | 'reset'>>) => void
  reset: () => void
}

export const useDrag = create<DragState>()((set) => ({
  source: null,
  kinds: [],
  overlay: null,
  target: null,
  pendingCombine: null,
  settling: [],
  set: (patch) => set(patch),
  reset: () => set({ source: null, kinds: [], overlay: null, target: null, pendingCombine: null }),
}))
