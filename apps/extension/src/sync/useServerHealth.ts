import { useEffect, useState } from 'react'
import { SyncClient } from './client'

export type Health =
  | { state: 'checking' | 'down' }
  | { state: 'ok'; version: string; google: boolean; signup: boolean }

/** Whether the sync server answers, and which sign-in options it offers. */
export function useServerHealth(serverUrl: string | null | undefined): Health {
  const [health, setHealth] = useState<Health>({ state: 'checking' })
  useEffect(() => {
    if (!serverUrl) return
    let cancelled = false
    setHealth({ state: 'checking' })
    new SyncClient(serverUrl)
      .health()
      .then((res) => {
        if (cancelled) return
        setHealth(
          res.name === 'tabhangar'
            ? {
                state: 'ok',
                version: res.version,
                google: res.auth?.google ?? false,
                // Older servers don't say; keep offering signup there.
                signup: res.auth?.signup ?? true,
              }
            : { state: 'down' },
        )
      })
      .catch(() => !cancelled && setHealth({ state: 'down' }))
    return () => {
      cancelled = true
    }
  }, [serverUrl])
  return health
}
