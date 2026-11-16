import { create } from 'zustand'
import { pickItems } from './pickItems'

export type SettingsTab = 'general' | 'appearance' | 'shortcuts' | 'data' | 'account'

type ModalState =
  | { type: 'linkEditor'; itemId: string }
  | { type: 'tags'; itemIds: string[] }
  | { type: 'categories' }
  | { type: 'search' }
  | { type: 'workspaces' }
  | { type: 'newWorkspace' }
  | { type: 'settings'; tab?: SettingsTab }
  | { type: 'bin' }
  | { type: 'bookmarks' }
  | { type: 'shortcuts' }
  | { type: 'reminders' }
  | { type: 'welcome' }
  | { type: 'week' }
  /** The feedback form; `fromCard` when it was opened from the two-week question. */
  | { type: 'feedback'; fromCard?: boolean }
  | { type: 'share'; groupId: string; title: string }
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

  /** Stack whose name is being edited (asked for from one of its menus). */
  renameStackId: string | null
  setRenameStack: (id: string | null) => void

  /** Item to scroll to and highlight briefly (e.g. after "show on board" in search). */
  flashItemId: string | null
  flashItem: (id: string | null) => void

  /** Item ids picked with Shift-click (all within one group). */
  selection: string[]
  selectionGroupId: string | null
  /** The item last Shift-clicked: the next Shift-click picks the range from it. */
  selectionAnchor: string | null
  /** Shift-click on an item; `order` is its list as shown (see `pickItems`). */
  pickItem: (id: string, groupId: string, order: readonly string[]) => void
  clearSelection: () => void

  /** Tags the board is filtered by: it shows only items with one of them. */
  tagFilter: string[]
  toggleTagFilter: (tagId: string) => void
  clearTagFilter: () => void
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

  renameStackId: null,
  setRenameStack: (id) => set({ renameStackId: id }),

  flashItemId: null,
  flashItem: (id) => set({ flashItemId: id }),

  selection: [],
  selectionGroupId: null,
  selectionAnchor: null,
  pickItem: (id, groupId, order) => {
    const { selection, selectionGroupId, selectionAnchor } = get()
    // Picking in another group starts over.
    const next =
      selectionGroupId === groupId ? pickItems(selection, selectionAnchor, id, order) : [id]
    set({
      selection: next,
      selectionGroupId: next.length ? groupId : null,
      selectionAnchor: next.length ? id : null,
    })
  },
  clearSelection: () => set({ selection: [], selectionGroupId: null, selectionAnchor: null }),

  tagFilter: [],
  toggleTagFilter: (tagId) => {
    const { tagFilter } = get()
    set({
      tagFilter: tagFilter.includes(tagId)
        ? tagFilter.filter((id) => id !== tagId)
        : [...tagFilter, tagId],
    })
  },
  clearTagFilter: () => set({ tagFilter: [] }),
}))
