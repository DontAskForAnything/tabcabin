import { localizeTemplate, type Template, TEMPLATES } from '@tabcabin/core'
import type { Locale, Translate } from '@/i18n'

export { TEMPLATES, type Template, type TemplateId } from '@tabcabin/core'

/** The everyday templates the welcome dialog offers; "New workspace" lists them all. */
export const FEATURED_TEMPLATES = TEMPLATES.filter((template) => template.featured)

/** What `createWorkspace` needs to build a template, in the user's language. */
export function templateWorkspace(template: Template, locale: Locale, t: Translate) {
  const { name, emoji, groups } = localizeTemplate(template, locale)
  return { name, emoji, categoryName: t('workspace.mainCategory'), groups }
}
