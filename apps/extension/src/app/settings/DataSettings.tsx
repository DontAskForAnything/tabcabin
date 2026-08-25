import { Braces, FileSpreadsheet, Bookmark, Upload } from 'lucide-react'
import { Button, SegmentedControl, toast } from '@tabhangar/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import {
  addGroupWithLinks,
  buildExport,
  downloadFile,
  type ExportFormat,
  ImportError,
  importJson,
  loadTopSites,
} from '@/data/transfer'
import { db } from '@/db/db'
import { clearAllData } from '@/db/repo'
import { useLocale, useT } from '@/i18n'
import { updateSettings } from '@/settings/settings'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { ActiveContext } from '../useActive'
import { Row, SectionTitle } from './Row'

function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / 1_048_576
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: mb >= 1 ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(mb >= 1 ? mb : bytes / 1024)
}

export function DataSettings({ active }: { active: ActiveContext }) {
  const t = useT()
  const locale = useLocale()
  const openModal = useUi((s) => s.openModal)
  const [usage, setUsage] = useState<number | null>(null)
  const [scope, setScope] = useState<'workspace' | 'all'>('workspace')
  const fileInput = useRef<HTMLInputElement>(null)
  const stats = useLiveQuery(async () => {
    const live = { filter: (row: { deletedAt: number | null }) => row.deletedAt === null }
    const [workspaces, groups, items] = await Promise.all([
      db.workspaces.filter(live.filter).count(),
      db.groups.filter(live.filter).count(),
      db.items.filter(live.filter).count(),
    ])
    return { workspaces, groups, items }
  }, [])
  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then((estimate) => setUsage(estimate.usage ?? null))
      .catch(() => undefined)
  }, [stats])

  const clear = async () => {
    const ok = await confirmDialog({
      title: t('settings.clearData'),
      description: t('settings.clearConfirm'),
      confirmLabel: t('settings.clearButton'),
      cancelLabel: t('common.cancel'),
      danger: true,
    })
    if (!ok) return
    await clearAllData()
    location.reload()
  }

  const exportAs = async (format: ExportFormat) => {
    const ids = scope === 'all' || !active.workspace ? null : [active.workspace.id]
    const file = await buildExport(format, ids)
    downloadFile(file)
    toast({ title: t('transfer.exported', { file: file.filename }), tone: 'success' })
  }

  const importFile = async (file: File) => {
    try {
      const result = await importJson(await file.text(), {
        tabExtendWorkspace: t('transfer.tabExtendWorkspace'),
        tabExtendCategory: t('transfer.tabExtendCategory'),
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

  const addTopSites = async () => {
    // Ask inside the click so the browser can show its prompt.
    const granted = await browser.permissions.request({ permissions: ['topSites'] })
    if (!granted) return toast({ title: t('transfer.permissionDenied'), tone: 'info' })
    if (!active.category) return
    const result = await addGroupWithLinks(
      active.category.id,
      { title: t('transfer.topSitesGroup'), emoji: '⭐' },
      (await loadTopSites()).slice(0, 12),
    )
    offerUndo(result, {
      title: t('transfer.topSitesAdded', { count: result.count }),
      undoLabel: t('common.undo'),
    })
  }

  return (
    <>
      <SectionTitle>{t('settings.tab.data')}</SectionTitle>
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
          <Button
            size="sm"
            icon={<FileSpreadsheet size={14} />}
            onClick={() => void exportAs('csv')}
          >
            {t('transfer.csv')}
          </Button>
        </div>
      </div>
      <Row label={t('transfer.import')} hint={t('transfer.importHint')}>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label={t('transfer.import')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void importFile(file)
          }}
        />
        <Button size="sm" icon={<Upload size={14} />} onClick={() => fileInput.current?.click()}>
          {t('transfer.chooseFile')}
        </Button>
      </Row>
      <Row label={t('transfer.chromeBookmarks')} hint={t('transfer.chromeBookmarksHint')}>
        <Button size="sm" onClick={() => openModal({ type: 'bookmarks' })}>
          {t('transfer.chooseFolders')}
        </Button>
      </Row>
      <Row label={t('transfer.topSites')} hint={t('transfer.topSitesHint')}>
        <Button size="sm" onClick={() => void addTopSites()}>
          {t('transfer.add')}
        </Button>
      </Row>
      <Row label={t('settings.storage')} hint={stats && t('settings.stats', stats)}>
        {usage !== null && (
          <span className="text-[13px] text-ink-3 tabular-nums">
            {t('settings.storageUsed', { used: formatBytes(usage, locale) })}
          </span>
        )}
      </Row>
      <Row label={t('settings.clearData')} hint={t('settings.clearDataHint')}>
        <Button size="sm" className="text-danger" onClick={() => void clear()}>
          {t('settings.clearButton')}
        </Button>
      </Row>
    </>
  )
}
