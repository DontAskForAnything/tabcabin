import { describe, expect, it, vi } from 'vitest'
import { webStore } from './webStore.ts'

const ITEM = { publisherId: 'pub-1', extensionId: 'abcdefghijklmnopabcdefghijklmnop' }
const BASE = 'https://chromewebstore.googleapis.com'
const NAME = 'publishers/pub-1/items/abcdefghijklmnopabcdefghijklmnop'
const ZIP = new Uint8Array([80, 75, 3, 4])

/** A stand-in for the store that answers each call with the next response. */
function fakeStore(...responses: Response[]) {
  const fetcher = vi.fn<typeof fetch>(async () => responses.shift() ?? Response.json({}))
  const wait = vi.fn(async () => {})
  const store = webStore(ITEM, { token: 'ya29.token', fetch: fetcher, wait })
  const calls = () => fetcher.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`)
  return { store, fetcher, wait, calls }
}

describe('webStore', () => {
  it('uploads the package as the draft', async () => {
    const { store, fetcher, calls } = fakeStore(
      Response.json({ uploadState: 'SUCCEEDED', crxVersion: '1.3.0' }),
    )
    await store.upload(ZIP)
    expect(calls()).toEqual([`POST ${BASE}/upload/v2/${NAME}:upload`])
    const init = fetcher.mock.calls[0]![1]!
    expect(init.body).toBe(ZIP)
    expect(init.headers).toEqual({ Authorization: 'Bearer ya29.token' })
  })

  it('waits while the store processes the package', async () => {
    const { store, wait, calls } = fakeStore(
      Response.json({ uploadState: 'IN_PROGRESS' }),
      Response.json({ lastAsyncUploadState: 'IN_PROGRESS' }),
      Response.json({ lastAsyncUploadState: 'SUCCEEDED' }),
    )
    await store.upload(ZIP)
    expect(calls().slice(1)).toEqual([
      `GET ${BASE}/v2/${NAME}:fetchStatus`,
      `GET ${BASE}/v2/${NAME}:fetchStatus`,
    ])
    expect(wait).toHaveBeenCalledTimes(2)
  })

  it('fails when processing fails', async () => {
    const { store } = fakeStore(
      Response.json({ uploadState: 'IN_PROGRESS' }),
      Response.json({ lastAsyncUploadState: 'FAILED' }),
    )
    await expect(store.upload(ZIP)).rejects.toThrow('the upload ended as FAILED')
  })

  it("passes on the store's reason, e.g. a version that was not raised", async () => {
    const { store } = fakeStore(
      Response.json(
        { error: { code: 400, message: 'The version must be greater than the published one.' } },
        { status: 400 },
      ),
    )
    await expect(store.upload(ZIP)).rejects.toThrow(
      'Chrome Web Store: The version must be greater than the published one.',
    )
  })

  it('sends the draft for review', async () => {
    const { store, calls } = fakeStore(
      Response.json({ itemId: ITEM.extensionId, state: 'PENDING_REVIEW' }),
    )
    await expect(store.submit()).resolves.toBe('PENDING_REVIEW')
    expect(calls()).toEqual([`POST ${BASE}/v2/${NAME}:publish`])
  })
})
