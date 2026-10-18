import { ExternalLink, Star } from 'lucide-react'
import { useT } from '@/i18n'
import { stopAsking } from '@/feedback/ask'

/** "Rate in the Chrome Web Store": opens the reviews in a new tab; the question stops there. */
export function RateLink({ url, onRate }: { url: string; onRate?: () => void }) {
  const t = useT()
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void stopAsking()
        onRate?.()
      }}
      className="mr-auto flex items-center gap-1.5 rounded-sm text-[13px] font-medium text-accent-ink outline-none hover:underline focus-visible:shadow-[0_0_0_2px_var(--focus)]"
    >
      <Star size={14} aria-hidden />
      {t('feedback.rate')}
      <ExternalLink size={12} aria-hidden className="opacity-75" />
    </a>
  )
}
