import { useCallback, useEffect, useState } from 'react'
import { ApiError, type Share, SyncClient } from '@/sync/client'
import { getAccount } from '@/sync/state'

export type ShareState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'shared'; share: Share; url: string }
  | { status: 'error'; code: string }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function client(): Promise<SyncClient> {
  const account = await getAccount()
  if (!account?.token) throw new ApiError(401, 'unauthorized')
  return new SyncClient(account.serverUrl, account.token)
}

/** The read-only link of one group: look it up, make it, take it down. */
export function useShare(groupId: string | null) {
  const [state, setState] = useState<ShareState>({ status: 'loading' })
  const fail = (error: unknown) =>
    setState({ status: 'error', code: error instanceof ApiError ? error.code : 'unknown' })

  useEffect(() => {
    if (!groupId) return
    setState({ status: 'loading' })
    void (async () => {
      const api = await client()
      const { share } = await api.getShare(groupId)
      setState(share ? { status: 'shared', share, url: api.shareUrl(share) } : { status: 'none' })
    })().catch(fail)
  }, [groupId])

  const create = useCallback(async () => {
    if (!groupId) return
    setState({ status: 'loading' })
    try {
      const api = await client()
      // A new group may still be on its way to the server: sync, then try a few times.
      void browser.runtime.sendMessage({ type: 'tabcabin:sync-now' }).catch(() => undefined)
      for (let attempt = 0; ; attempt++) {
        try {
          const { share } = await api.shareGroup(groupId)
          setState({ status: 'shared', share, url: api.shareUrl(share) })
          return
        } catch (error) {
          if (!(error instanceof ApiError) || error.code !== 'not_synced' || attempt >= 4)
            throw error
          await wait(1500)
        }
      }
    } catch (error) {
      fail(error)
    }
  }, [groupId])

  const stop = useCallback(async () => {
    if (state.status !== 'shared') return
    try {
      await (await client()).unshare(state.share.id)
      setState({ status: 'none' })
    } catch (error) {
      fail(error)
    }
  }, [state])

  return { state, create, stop }
}
