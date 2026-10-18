import { Button } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '@/db/db'
import { clearAllData } from '@/db/repo'
import { useLocale, useT } from '@/i18n'
import { confirmDialog } from '@/state/confirm'
import { getAccount } from '@/sync/state'
import { requestSignOut } from '../account/requestSignOut'
import { Row } from '../Row'

function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / 1_048_576
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: mb >= 1 ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: 1,
  }).format(mb >= 1 ? mb : bytes / 1024)
}

/** How much is stored in this browser, and a way to start over. */
export function StorageRows() {
  const t = useT()
  const locale = useLocale()
  const [usage, setUsage] = useState<number | null>(null)
  const stats = useLiveQuery(async () => {
    const live = (row: { deletedAt: number | null }) => row.deletedAt === null
    const [workspaces, groups, items] = await Promise.all([
      db.workspaces.filter(live).count(),
      db.groups.filter(live).count(),
      db.items.filter(live).count(),
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
    // Signed in: end the session and stop syncing first, so nothing comes back from the server.
    if (await getAccount()) await requestSignOut({ remove: false, force: false })
    await clearAllData()
    location.reload()
  }

  return (
    <>
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
