const API = 'https://chromewebstore.googleapis.com'

export interface StoreItem {
  publisherId: string
  extensionId: string
}

interface Options {
  token: string
  fetch?: typeof fetch
  /** Pause between status checks, replaceable in tests. */
  wait?: (ms: number) => Promise<void>
}

type UploadState = 'SUCCEEDED' | 'IN_PROGRESS' | 'FAILED' | 'NOT_FOUND' | 'UPLOAD_STATE_UNSPECIFIED'

const CHECK_EVERY_MS = 5_000
const MAX_CHECKS = 60

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Chrome Web Store API (v2) calls for one item. */
export function webStore(
  item: StoreItem,
  { token, fetch: fetcher = fetch, wait = sleep }: Options,
) {
  const name = `publishers/${item.publisherId}/items/${item.extensionId}`

  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetcher(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } }
    if (!response.ok)
      throw new Error(`Chrome Web Store: ${body.error?.message ?? `HTTP ${response.status}`}`)
    return body
  }

  /** Big packages are processed after the upload answers; ask until it is done. */
  const settle = async (state: UploadState): Promise<UploadState> => {
    for (let checks = 0; state === 'IN_PROGRESS'; checks++) {
      if (checks === MAX_CHECKS) throw new Error('Chrome Web Store: the upload is still processing')
      await wait(CHECK_EVERY_MS)
      const status = await call<{ lastAsyncUploadState?: UploadState }>(`/v2/${name}:fetchStatus`)
      state = status.lastAsyncUploadState ?? 'IN_PROGRESS'
    }
    return state
  }

  return {
    /** Replaces the item's draft with a new package (its version must be higher). */
    async upload(zip: Uint8Array<ArrayBuffer>): Promise<void> {
      const result = await call<{ uploadState: UploadState }>(`/upload/v2/${name}:upload`, {
        method: 'POST',
        body: zip,
      })
      const state = await settle(result.uploadState)
      if (state !== 'SUCCEEDED') throw new Error(`Chrome Web Store: the upload ended as ${state}`)
    },

    /** Sends the draft for review; it goes live by itself once approved. Returns the item state. */
    async submit(): Promise<string> {
      const result = await call<{ state: string }>(`/v2/${name}:publish`, { method: 'POST' })
      return result.state
    },
  }
}
