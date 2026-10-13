import { toast } from '@tabcabin/ui'
import { ImportError, importFile } from '@/data/importFile'
import { useT } from '@/i18n'
import { updateSettings } from '@/settings/settings'

/** File types the import understands, for file pickers. */
export const IMPORT_ACCEPT = '.json,.html,.htm,.txt,.md,application/json,text/html,text/plain'

/**
 * Imports a backup, a Toby or tabExtend export, a bookmarks file or a list of links into new
 * workspaces, opens the first one and says how it went. Resolves to whether it worked.
 */
export function useImportFile() {
  const t = useT()
  return async (file: File): Promise<boolean> => {
    try {
      const result = await importFile(await file.text(), {
        tabExtend: t('transfer.tabExtendWorkspace'),
        toby: t('transfer.tobyWorkspace'),
        bookmarks: t('transfer.bookmarksWorkspace'),
        oneTab: t('transfer.oneTabWorkspace'),
        links: t('transfer.linksWorkspace'),
        category: t('transfer.tabExtendCategory'),
        group: t('transfer.importedGroup'),
      })
      await updateSettings({ activeWorkspaceId: result.workspaceId })
      toast({
        title: t('transfer.imported', { count: result.workspaces }),
        description: t('transfer.importedDetails', { groups: result.groups, items: result.items }),
        tone: 'success',
      })
      return true
    } catch (error) {
      const reason = error instanceof ImportError ? error.message : String(error)
      toast({ title: t('transfer.importFailed', { reason }), tone: 'error' })
      return false
    }
  }
}
