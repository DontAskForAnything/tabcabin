import { isTemplateId } from '@tabcabin/core'
import { addTemplate } from './addTemplate'

/**
 * What the website may ask (manifest `externally_connectable` lets only TabCabin's own site
 * talk to the extension): whether TabCabin is installed, and to add one of the built-in
 * templates. It sends a template id and nothing else, so a page can never put its own content
 * into someone's boards.
 */
export type SiteReply =
  | { ok: true; version: string }
  | { ok: true; workspace: string }
  | { ok: false; error: 'unknown-message' | 'unknown-template' | 'failed' }

export async function handleSiteMessage(message: unknown): Promise<SiteReply> {
  const type = (message as { type?: unknown } | null)?.type
  if (type === 'tabcabin:hello') return { ok: true, version: browser.runtime.getManifest().version }
  if (type !== 'tabcabin:add-template') return { ok: false, error: 'unknown-message' }
  const id = (message as { id?: unknown }).id
  if (!isTemplateId(id)) return { ok: false, error: 'unknown-template' }
  return { ok: true, workspace: await addTemplate(id) }
}
