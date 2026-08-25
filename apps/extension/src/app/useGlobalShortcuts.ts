import { useEffect } from 'react'
import { isTyping, matchesShortcut } from '@/lib/keys'
import { useUi } from '@/state/ui'
import { undoLast } from '@/state/undo'
import { useBoardActions } from './board/actions'
import { setActiveCategory, type ActiveContext } from './useActive'

export function useGlobalShortcuts(active: ActiveContext) {
  const actions = useBoardActions(active)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { settings, workspace, categories } = active
      const ui = useUi.getState()
      if (event.key === 'Escape' && ui.selection.length) {
        ui.clearSelection()
        return
      }
      if (!settings) return
      const shortcuts = settings.shortcuts
      if (matchesShortcut(event, shortcuts.search)) {
        event.preventDefault()
        ui.openModal({ type: 'search' })
        return
      }
      if (matchesShortcut(event, shortcuts.workspaces)) {
        event.preventDefault()
        ui.openModal({ type: 'workspaces' })
        return
      }
      if (matchesShortcut(event, shortcuts.bin)) {
        event.preventDefault()
        ui.openModal({ type: 'bin' })
        return
      }
      if (isTyping(event) || ui.modal) return
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        void undoLast()
        return
      }
      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        ui.openModal({ type: 'shortcuts' })
        return
      }
      if (matchesShortcut(event, shortcuts.newGroup)) {
        event.preventDefault()
        void actions.createGroup()
        return
      }
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        /^[1-9]$/.test(event.key) &&
        workspace &&
        categories
      ) {
        const target = categories[Number(event.key) - 1]
        if (target) void setActiveCategory(settings, workspace.id, target.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, actions])
}
