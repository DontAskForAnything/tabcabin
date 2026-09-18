import { Button } from '@tabhangar/ui'
import { useT } from '@/i18n'
import { SELF_HOSTING_DOCS } from '@/lib/links'
import { openBoards } from '@/lib/pages'

/** For builds without a sync server (see src/sync/server.ts). */
export function NoServer() {
  const t = useT()
  return (
    <div className="flex flex-col items-start">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">{t('signin.noServerTitle')}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{t('signin.noServerText')}</p>
      <a
        href={SELF_HOSTING_DOCS}
        target="_blank"
        rel="noreferrer"
        className="mt-3 text-[14px] font-medium text-accent-ink hover:underline"
      >
        {t('sync.howTo')}
      </a>
      <Button variant="primary" size="lg" className="mt-7" onClick={openBoards}>
        {t('signin.openBoards')}
      </Button>
    </div>
  )
}
