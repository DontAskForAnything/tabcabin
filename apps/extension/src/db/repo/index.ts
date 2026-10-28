/*
 * Every change to boards goes through here: each operation applies its changes and returns the
 * change set that undoes it (see `commit`).
 */
export { type Result, revert } from './commit'
export { getCategories, getGroups, getTopLevelItems, getWorkspaces } from './reads'
export { createWorkspace, deleteWorkspace, reorderWorkspace, updateWorkspace } from './workspaces'
export { createCategory, deleteCategory, moveCategory, updateCategory } from './categories'
export {
  createGroup,
  deleteGroup,
  duplicateGroup,
  moveGroup,
  sortGroup,
  updateGroup,
} from './groups'
export {
  addImage,
  addLinks,
  addNote,
  combine,
  convertNote,
  deleteItems,
  type ItemPatch,
  moveItemsTo,
  type NewLink,
  unstackById,
  updateItem,
} from './items'
export { type BinEntry, listBin } from './bin/list'
export { BIN_LIMIT, emptyBin, purgeFromBin, trimBin } from './bin/purge'
export { restoreFromBin } from './bin/restore'
export {
  completeReminder,
  getItemReminder,
  markRemindersFired,
  type ReminderInput,
  removeReminder,
  setReminder,
  snoozeReminder,
} from './reminders'
export { clearAllData } from './clear'
export { ensureInbox } from './inbox'
