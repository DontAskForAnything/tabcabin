import { ApiError, SyncClient } from '@/sync/client'
import { isSyncServer } from '@/sync/serverName'

export type SendResult = 'sent' | 'off' | 'limit' | 'failed'

/** Whether the server passes feedback on; asked once per page, when the form opens. */
const checked = new Map<string, Promise<boolean>>()

export function takesFeedback(serverUrl: string): Promise<boolean> {
  let check = checked.get(serverUrl)
  if (!check) {
    check = new SyncClient(serverUrl)
      .health()
      .then((health) => isSyncServer(health.name) && health.feedback === true)
      .catch(() => {
        checked.delete(serverUrl)
        return true
      })
    checked.set(serverUrl, check)
  }
  return check
}

/** Sends the form through the sync server, which passes it on to the developer. */
export async function sendFeedback(
  serverUrl: string,
  message: { text: string; email: string; language: string },
): Promise<SendResult> {
  const version = browser.runtime.getManifest().version
  try {
    await new SyncClient(serverUrl).sendFeedback({ ...message, version })
    return 'sent'
  } catch (error) {
    if (!(error instanceof ApiError)) return 'failed'
    if (error.code === 'feedback_off') return 'off'
    return error.status === 429 ? 'limit' : 'failed'
  }
}
