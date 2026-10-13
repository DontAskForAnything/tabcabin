import type { MessageKey, Translate } from '@/i18n'

export type TemplateId = 'work' | 'home' | 'study' | 'project'

export interface Template {
  id: TemplateId
  emoji: string
  name: MessageKey
  groups: { emoji: string; title: MessageKey }[]
}

/** Ready-made workspaces: a name, an icon and a few empty groups to fill. */
export const TEMPLATES: Template[] = [
  {
    id: 'work',
    emoji: '💼',
    name: 'template.work',
    groups: [
      { emoji: '🗂️', title: 'template.work.projects' },
      { emoji: '📅', title: 'template.work.meetings' },
      { emoji: '📚', title: 'template.work.readLater' },
    ],
  },
  {
    id: 'home',
    emoji: '🏠',
    name: 'template.home',
    groups: [
      { emoji: '🛒', title: 'template.home.shopping' },
      { emoji: '🍳', title: 'template.home.recipes' },
      { emoji: '✈️', title: 'template.home.trips' },
    ],
  },
  {
    id: 'study',
    emoji: '🎓',
    name: 'template.study',
    groups: [
      { emoji: '📘', title: 'template.study.courses' },
      { emoji: '📝', title: 'template.study.notes' },
      { emoji: '📖', title: 'template.study.reading' },
    ],
  },
  {
    id: 'project',
    emoji: '🛠️',
    name: 'template.project',
    groups: [
      { emoji: '💡', title: 'template.project.ideas' },
      { emoji: '✅', title: 'template.project.tasks' },
      { emoji: '🔗', title: 'template.project.resources' },
    ],
  },
]

/** What `createWorkspace` needs to build a template, in the user's language. */
export function templateWorkspace(template: Template, t: Translate) {
  return {
    name: t(template.name),
    emoji: template.emoji,
    categoryName: t('workspace.mainCategory'),
    groups: template.groups.map((group) => ({ emoji: group.emoji, title: t(group.title) })),
  }
}
