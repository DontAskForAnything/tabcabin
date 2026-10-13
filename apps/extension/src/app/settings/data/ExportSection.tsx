import { Bookmark, Braces, FileSpreadsheet } from 'lucide-react'
import { Button, SegmentedControl, toast } from '@tabcabin/ui'
import { useState } from 'react'
import { buildExport, downloadFile, type ExportFormat } from '@/data/exportFile'
import { useT } from '@/i18n'
import type { ActiveContext } from '../../useActive'

/** Download this workspace or everything as JSON (backup), bookmarks HTML or CSV. */
export function ExportSection({ active }: { active: ActiveContext }) {
  const t = useT()
  const [scope, setScope] = useState<'workspace' | 'all'>('workspace')

  const exportAs = async (format: ExportFormat) => {
    const ids = scope === 'all' || !active.workspace ? null : [active.workspace.id]
    const file = await buildExport(format, ids, t('inbox.title'))
    downloadFile(file)
    toast({ title: t('transfer.exported', { file: file.filename }), tone: 'success' })
  }

  return (
    <div className="flex flex-col gap-3 border-b border-line py-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium">{t('transfer.export')}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
            {t('transfer.exportHint')}
          </div>
        </div>
        <SegmentedControl<'workspace' | 'all'>
          label={t('transfer.export')}
          value={scope}
          onValueChange={setScope}
          options={[
            { value: 'workspace', label: t('transfer.scopeWorkspace') },
            { value: 'all', label: t('transfer.scopeAll') },
          ]}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" icon={<Braces size={14} />} onClick={() => void exportAs('json')}>
          {t('transfer.json')}
        </Button>
        <Button size="sm" icon={<Bookmark size={14} />} onClick={() => void exportAs('html')}>
          {t('transfer.html')}
        </Button>
        <Button size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => void exportAs('csv')}>
          {t('transfer.csv')}
        </Button>
      </div>
    </div>
  )
}
