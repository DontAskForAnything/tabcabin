import type { Tag } from '@tabcabin/core'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { useTags } from '@/db/hooks'

interface TagsValue {
  /** The account's tags in their order. */
  tags: Tag[]
  byId: Map<string, Tag>
}

const TagsContext = createContext<TagsValue>({ tags: [], byId: new Map() })

/** Reads the tags once for everything on the page that shows them. */
export function TagsProvider({ children }: { children: ReactNode }) {
  const tags = useTags()
  const value = useMemo(() => {
    const list = tags ?? []
    return { tags: list, byId: new Map(list.map((tag) => [tag.id, tag])) }
  }, [tags])
  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export const useTagList = () => useContext(TagsContext)

/** The tags of an item that still exist, in the item's order. */
export function useItemTags(tagIds: readonly string[] | undefined): Tag[] {
  const { byId } = useTagList()
  return (tagIds ?? []).flatMap((id) => byId.get(id) ?? [])
}
