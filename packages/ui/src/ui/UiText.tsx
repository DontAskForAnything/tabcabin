import { createContext, type ReactNode, useContext } from 'react'

/** Texts the components render themselves; the app provides translations. */
export interface UiText {
  locale: 'en' | 'pl'
  close: string
  dismiss: string
  searchEmoji: string
  noEmoji: string
}

const DEFAULT_TEXT: UiText = {
  locale: 'en',
  close: 'Close',
  dismiss: 'Dismiss',
  searchEmoji: 'Search emoji',
  noEmoji: 'No emoji found',
}

const UiTextContext = createContext<UiText>(DEFAULT_TEXT)

export function UiTextProvider({ text, children }: { text: UiText; children: ReactNode }) {
  return <UiTextContext.Provider value={text}>{children}</UiTextContext.Provider>
}

export const useUiText = () => useContext(UiTextContext)
