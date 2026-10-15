import type { NoteColor } from '../schema'

/** The languages templates are written in (the extension's languages). */
export type TemplateLocale = 'en' | 'pl'
export type TemplateText = Record<TemplateLocale, string>

export const TEMPLATE_IDS = [
  'work',
  'home',
  'study',
  'project',
  'job-hunt',
  'thesis',
  'trip',
  'moving',
  'gifts',
  'weekly',
] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

/** What a group starts with: a tip, a short checklist, or a link worth having there. */
export type TemplateItem =
  | { note: TemplateText; color?: NoteColor }
  | { todo: TemplateText }
  | { link: string; title: string }

export interface TemplateGroup {
  emoji: string
  title: TemplateText
  items: TemplateItem[]
}

export interface Template {
  id: TemplateId
  emoji: string
  name: TemplateText
  /** One line for pickers and the website. */
  summary: TemplateText
  /** Offered in the welcome dialog; the others appear in "New workspace" and on the website. */
  featured: boolean
  groups: TemplateGroup[]
}
