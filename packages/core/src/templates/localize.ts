import type { NoteColor } from '../schema'
import { TEMPLATES } from './catalog'
import {
  TEMPLATE_IDS,
  type Template,
  type TemplateId,
  type TemplateItem,
  type TemplateLocale,
} from './types'

/** A template item ready to be stored: a note (maybe a to-do) or a link. */
export type TemplateRow =
  | { kind: 'note'; text: string; todo: boolean; color: NoteColor | null }
  | { kind: 'link'; url: string; title: string }

export interface LocalizedTemplate {
  id: TemplateId
  emoji: string
  name: string
  summary: string
  groups: { emoji: string; title: string; items: TemplateRow[] }[]
}

export const isTemplateId = (id: unknown): id is TemplateId =>
  typeof id === 'string' && (TEMPLATE_IDS as readonly string[]).includes(id)

export const templateById = (id: TemplateId): Template =>
  TEMPLATES.find((template) => template.id === id)!

function row(item: TemplateItem, locale: TemplateLocale): TemplateRow {
  if ('link' in item) return { kind: 'link', url: item.link, title: item.title }
  if ('todo' in item) return { kind: 'note', text: item.todo[locale], todo: true, color: null }
  return { kind: 'note', text: item.note[locale], todo: false, color: item.color ?? null }
}

/** The template in one language, as plain strings. */
export function localizeTemplate(template: Template, locale: TemplateLocale): LocalizedTemplate {
  return {
    id: template.id,
    emoji: template.emoji,
    name: template.name[locale],
    summary: template.summary[locale],
    groups: template.groups.map((group) => ({
      emoji: group.emoji,
      title: group.title[locale],
      items: group.items.map((item) => row(item, locale)),
    })),
  }
}
