import type { PopoverData } from '@/background/popover'
import type { Translate } from '@/i18n'
import type { Target } from './types'

/** "🌍 Today › 📚 Read later" for the chosen target. */
export function targetLabel(data: PopoverData | null, target: Target | null, t: Translate): string {
  if (!data || !target) return '…'
  for (const ws of data.workspaces)
    for (const cat of ws.categories) {
      if ('newGroupIn' in target && target.newGroupIn === cat.id)
        return `${ws.emoji} ${cat.name} › ${t('menu.newGroup')}`
      const group = cat.groups.find((g) => 'groupId' in target && g.id === target.groupId)
      if (group)
        return `${ws.emoji} ${cat.name} › ${group.emoji} ${group.title || t('group.untitled')}`
    }
  return '…'
}
