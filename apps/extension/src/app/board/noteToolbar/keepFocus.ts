import type { MouseEvent } from 'react'

/** Toolbar buttons must not take focus away from the note being edited. */

export const keepFocus = (event: MouseEvent) => event.preventDefault()
