import { create } from 'zustand'

export type SettingsTab = 'general' | 'appearance' | 'shortcuts' | 'data' | 'account'

type ModalState =
  | { type: 'linkEditor'; itemId: string }
  | { type: 'categories' }
  | { type: 'search' }
  | { type: 'workspaces' }
  | { type: 'newWorkspace' }
  | { type: 'settings'; tab?: SettingsTab }
  | { type: 'bin' }
  | { type: 'bookmarks' }
  | { type: 'shortcuts' }
  | { type: 'reminders' }
  | null

interface UiState {
  modal: ModalState
  openModal: (modal: Exclude<ModalState, null>) => void
  closeModal: () => void

  /** Item whose reminder is being edited (a dialog that can open above other modals). */
  reminderItemId: string | null
  editReminder: (itemId: string | null) => void

  /** Note currently edited inline (shows the note toolbar). */
  editingNoteId: string | null
  setEditingNote: (id: string | null) => void

  /** Group whose title should get focus (after creating it). */
  focusGroupTitleId: string | null
  setFocusGroupTitle: (id: string | null) => void

  /** Item to scroll to and highlight briefly (e.g. after "show on board" in search). */
  flashItemId: string | null
  flashItem: (id: string | null) => void

  /** Item ids selected with Shift/Cmd/Ctrl+click (all within one group). */
  selection: string[]
  selectionGroupId: string | null
  toggleSelected: (id: string, groupId: string) => void
  clearSelection: () => void
}

export const useUi = create<UiState>()((set, get) => ({
  modal: null,
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  reminderItemId: null,
  editReminder: (itemId) => set({ reminderItemId: itemId }),

  editingNoteId: null,
  setEditingNote: (id) => set({ editingNoteId: id }),

  focusGroupTitleId: null,
  setFocusGroupTitle: (id) => set({ focusGroupTitleId: id }),

  flashItemId: null,
  flashItem: (id) => set({ flashItemId: id }),

  selection: [],
  selectionGroupId: null,
  toggleSelected: (id, groupId) => {
    const { selection, selectionGroupId } = get()
    if (selectionGroupId !== groupId) {
      set({ selection: [id], selectionGroupId: groupId })
      return
    }
    const next = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]
    set({ selection: next, selectionGroupId: next.length ? groupId : null })
  },
  clearSelection: () => set({ selection: [], selectionGroupId: null }),
}))
