import { create } from 'zustand'

interface PanelState {
  /** Window shown in the panel (null = the window this page lives in). */
  windowId: number | null
  setWindowId: (id: number | null) => void
  selected: number[]
  toggle: (id: number) => void
  clear: () => void
  collapsedGroups: number[]
  toggleGroup: (id: number) => void
  /** Rail mode: the panel is temporarily expanded by hovering. */
  peek: boolean
  setPeek: (peek: boolean) => void
}

export const usePanel = create<PanelState>()((set, get) => ({
  windowId: null,
  setWindowId: (windowId) => set({ windowId, selected: [] }),
  selected: [],
  toggle: (id) => {
    const selected = get().selected
    set({ selected: selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id] })
  },
  clear: () => set({ selected: [] }),
  collapsedGroups: [],
  toggleGroup: (id) => {
    const groups = get().collapsedGroups
    set({ collapsedGroups: groups.includes(id) ? groups.filter((g) => g !== id) : [...groups, id] })
  },
  peek: false,
  setPeek: (peek) => set({ peek }),
}))
