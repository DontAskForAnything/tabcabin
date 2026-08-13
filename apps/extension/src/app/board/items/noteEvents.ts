/** Lets the docked note toolbar insert text (e.g. an emoji) at the caret of the note being edited. */
const EVENT = 'tabhangar:note-insert'

export function insertIntoNote(text: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: text }))
}

export function onNoteInsert(handler: (text: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
