import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { type MessageKey } from './en'
import { translate, type Params, type Translate } from './translate'
import type { Locale } from './types'

export type { Locale, MessageKey, Translate }

const I18nContext = createContext<{ locale: Locale; t: Translate }>({
  locale: 'en',
  t: (key, params) => translate('en', key, params),
})

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: (key: MessageKey, params?: Params) => translate(locale, key, params) }),
    [locale],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): Translate {
  return useContext(I18nContext).t
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale
}
