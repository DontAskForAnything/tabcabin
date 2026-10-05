import { LogIn } from 'lucide-react'
import { Button } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { openSignInPage } from '@/lib/pages'

export function SignedOutAccount({ expired }: { expired: boolean }) {
  const t = useT()
  return (
    <div className="flex flex-col items-start gap-4 pt-1">
      <p className="text-[13.5px] leading-relaxed text-ink-3">{t('sync.intro')}</p>
      {expired && (
        <p className="rounded-[11px] bg-subtle px-3.5 py-2.5 text-[13px] text-ink-2">
          {t('sync.sessionExpired')}
        </p>
      )}
      <Button
        variant="primary"
        icon={<LogIn size={15} />}
        onClick={() => openSignInPage(location.pathname.endsWith('/newtab.html'))}
      >
        {t('sync.signIn')}
      </Button>
    </div>
  )
}
