import { isTemplateId } from '@tabcabin/core'
import { addShared, NoSyncServer, SharedGone } from './addShared'
import { addTemplate } from './addTemplate'

/**
 * What the website may ask (manifest `externally_connectable` lets only TabCabin's own site
 * talk to the extension): whether TabCabin is installed, to add one of the built-in templates,
 * and to import a group someone shared. It sends a template id or a share id and nothing else
 * (the shared group comes from TabCabin's own sync server), so a page can never put its own
 * content into someone's boards.
 */
export type SiteReply =
  | { ok: true; version: string }
  | { ok: true; workspace: string }
  | { ok: true; group: string }
  | {
      ok: false
      error:
        'unknown-message' | 'unknown-template' | 'unknown-share' | 'gone' | 'no-sync' | 'failed'
    }

async function importShared(id: unknown): Promise<SiteReply> {
  if (typeof id !== 'string' || !/^[\w-]{8,64}$/.test(id))
    return { ok: false, error: 'unknown-share' }
  try {
    return { ok: true, group: await addShared(id) }
  } catch (error) {
    if (error instanceof SharedGone) return { ok: false, error: 'gone' }
    if (error instanceof NoSyncServer) return { ok: false, error: 'no-sync' }
    throw error
  }
}

export async function handleSiteMessage(message: unknown): Promise<SiteReply> {
  const type = (message as { type?: unknown } | null)?.type
  if (type === 'tabcabin:hello') return { ok: true, version: browser.runtime.getManifest().version }
  if (type === 'tabcabin:add-shared') return importShared((message as { id?: unknown }).id)
  if (type !== 'tabcabin:add-template') return { ok: false, error: 'unknown-message' }
  const id = (message as { id?: unknown }).id
  if (!isTemplateId(id)) return { ok: false, error: 'unknown-template' }
  return { ok: true, workspace: await addTemplate(id) }
}
