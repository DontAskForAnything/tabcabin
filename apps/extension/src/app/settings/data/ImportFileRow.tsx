import { Upload } from 'lucide-react'
import { Button, toast } from '@tabcabin/ui'
import { useRef } from 'react'
import { ImportError, importFile } from '@/data/importFile'
import { useT } from '@/i18n'
import { updateSettings } from '@/settings/settings'
import { Row } from '../Row'

/** Imports a backup, a Toby or tabExtend export, a bookmarks file or a list of links. */
export function ImportFileRow() {
  const t = useT()
  const fileInput = useRef<HTMLInputElement>(null)

  const run = async (file: File) => {
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
    } catch (error) {
      const reason = error instanceof ImportError ? error.message : String(error)
      toast({ title: t('transfer.importFailed', { reason }), tone: 'error' })
    }
  }

  return (
    <Row label={t('transfer.import')} hint={t('transfer.importHint')}>
      <input
        ref={fileInput}
        type="file"
        accept=".json,.html,.htm,.txt,.md,application/json,text/html,text/plain"
        aria-label={t('transfer.import')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void run(file)
        }}
      />
      <Button size="sm" icon={<Upload size={14} />} onClick={() => fileInput.current?.click()}>
        {t('transfer.chooseFile')}
      </Button>
    </Row>
  )
}
