import { en, type MessageKey } from './en'
import { pl } from './pl'
import type { Locale, Message } from './types'

const dictionaries: Record<Locale, Record<MessageKey, Message>> = { en, pl }

export type Params = Record<string, string | number>

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const message = dictionaries[locale][key] ?? en[key]
  if (typeof message === 'string') return interpolate(message, params)
  const count = typeof params?.count === 'number' ? params.count : 0
  const category = new Intl.PluralRules(locale).select(count) as keyof typeof message
  const form = message[category] ?? message.other
  return interpolate(form, params)
}

export type Translate = (key: MessageKey, params?: Params) => string
