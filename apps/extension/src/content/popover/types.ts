/** The page being saved. */
export interface PageInfo {
  url: string
  title: string
  favIconUrl: string | null
}

/** Where the page goes: an existing group, or a new group in a category. */
export type Target = { groupId: string } | { newGroupIn: string; title: string }
