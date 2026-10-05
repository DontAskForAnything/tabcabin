import { Check } from 'lucide-react'
import { Button } from '@tabcabin/ui'
import { useEffect } from 'react'
import { useT } from '@/i18n'
import { openBoards } from '@/lib/pages'

/** Shown after signing in; heads back to the boards on its own. */
export function SignedInNote({ username }: { username: string }) {
  const t = useT()
  // Head back to the boards on their own after a moment.
  useEffect(() => {
    const timer = setTimeout(openBoards, 2500)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="flex flex-col items-start">
      <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        <Check size={24} strokeWidth={2.5} />
      </span>
      <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.025em]">
        {t('signin.doneTitle')}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">
        {t('signin.doneText', { username })}
      </p>
      <Button variant="primary" size="lg" className="mt-7" onClick={openBoards}>
        {t('signin.openBoards')}
      </Button>
    </div>
  )
}
