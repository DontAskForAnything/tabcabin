import { create } from 'zustand'
import { rememberPicking } from './pickHint'
import { pickRange, toggleTab } from './tabSelection'

interface PanelState {
  /** Window shown in the panel (null = the window this page lives in). */
  windowId: number | null
  setWindowId: (id: number | null) => void
  selected: number[]
  /** The tab last clicked with a modifier: Shift-click picks the range from it. */
  anchor: number | null
  toggle: (id: number) => void
  /** Picks the tabs from the anchor to this one; `order` is the tabs as the panel shows them. */
  pickRange: (id: number, order: readonly number[]) => void
  clear: () => void
  collapsedGroups: number[]
  toggleGroup: (id: number) => void
  /** Rail mode: the panel is temporarily expanded by hovering. */
  peek: boolean
  setPeek: (peek: boolean) => void
}

export const usePanel = create<PanelState>()((set, get) => {
  const select = (selected: number[], anchor: number) => {
    set({ selected, anchor })
    if (selected.length > 1) void rememberPicking()
  }
  return {
    windowId: null,
    setWindowId: (windowId) => set({ windowId, selected: [], anchor: null }),
    selected: [],
    anchor: null,
    toggle: (id) => select(toggleTab(get().selected, id), id),
    pickRange: (id, order) => select(pickRange(get().selected, get().anchor, id, order), id),
    clear: () => set({ selected: [], anchor: null }),
    collapsedGroups: [],
    toggleGroup: (id) => {
      const groups = get().collapsedGroups
      set({
        collapsedGroups: groups.includes(id) ? groups.filter((g) => g !== id) : [...groups, id],
      })
    },
    peek: false,
    setPeek: (peek) => set({ peek }),
  }
})
