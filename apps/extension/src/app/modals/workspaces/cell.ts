/** A spot in the picker that can have keyboard focus: a workspace row or one of its categories. */
export interface Cell {
  workspaceId: string
  categoryId: string
}
