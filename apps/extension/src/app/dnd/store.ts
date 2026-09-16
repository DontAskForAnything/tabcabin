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
  overlay: OverlayInfo | null
  target: DropTarget
  /** Item the pointer rests on; becomes a combine target after a short delay. */
  pendingCombine: string | null
  set: (patch: Partial<Omit<DragState, 'set' | 'reset'>>) => void
  reset: () => void
}

export const useDrag = create<DragState>()((set) => ({
  source: null,
  overlay: null,
  target: null,
  pendingCombine: null,
  set: (patch) => set(patch),
  reset: () => set({ source: null, overlay: null, target: null, pendingCombine: null }),
}))
