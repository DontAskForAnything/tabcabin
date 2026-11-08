/** One row of a shared group, as the sync server's /shared/<id> gives it. */
export interface SharedItem {
  id: string
  kind: string
  title: string
  url: string | null
  favIconUrl: string | null
  text: string
  color: string | null
  todo: boolean
  done: boolean
  parentId: string | null
}

export interface SharedGroup {
  title: string
  emoji: string
  sharedAt: number
  updatedAt: number
  items: SharedItem[]
}

export type Loaded =
  { status: 'ok'; group: SharedGroup } | { status: 'gone' } | { status: 'failed' }

/** The group behind a link, read from the sync server as it is now. */
export async function loadShared(server: string, id: string): Promise<Loaded> {
  try {
    const res = await fetch(`${server}/shared/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (res.status === 404) return { status: 'gone' }
    if (!res.ok) return { status: 'failed' }
    const { group } = (await res.json()) as { group?: SharedGroup }
    return group && Array.isArray(group.items) ? { status: 'ok', group } : { status: 'failed' }
  } catch {
    return { status: 'failed' }
  }
}
