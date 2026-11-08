type Reply = { ok: boolean; group?: string; error?: string }
declare const chrome:
  | { runtime?: { sendMessage(id: string, message: object, reply: (r?: Reply) => void): void } }
  | undefined

/** What the page says after Import, by the extension's answer. */
function outcome(reply: Reply | undefined): string {
  if (reply?.ok) return `Imported: “${reply.group}” is open in a new tab.`
  if (reply?.error === 'gone') return 'This link no longer works, so there is nothing to import.'
  if (reply?.error === 'unknown-message')
    return 'Update TabCabin to import shared groups, then try again.'
  return 'That did not work. Try again in a moment.'
}

/**
 * With TabCabin installed (it lets this site talk to it), Get TabCabin turns into Import to your
 * TabCabin, which copies the group into the board shown last.
 */
export function offerImport(root: HTMLElement, shareId: string) {
  const extension = root.dataset.extension
  const runtime = typeof chrome === 'undefined' ? undefined : chrome.runtime
  if (!extension || !runtime?.sendMessage) return
  const get = root.querySelector<HTMLElement>('[data-get]')!
  const box = root.querySelector<HTMLElement>('[data-import]')!
  const button = box.querySelector('button')!
  const status = root.querySelector<HTMLElement>('[data-import-status]')!
  const send = (message: object) =>
    new Promise<Reply | undefined>((resolve) => {
      try {
        runtime.sendMessage(extension, message, resolve)
      } catch {
        resolve(undefined)
      }
    })
  void send({ type: 'tabcabin:hello' }).then((hello) => {
    if (!hello?.ok) return
    get.hidden = true
    box.hidden = false
    button.onclick = async () => {
      button.disabled = true
      status.textContent = ''
      const reply = await send({ type: 'tabcabin:add-shared', id: shareId })
      button.disabled = false
      status.textContent = outcome(reply)
    }
  })
}
