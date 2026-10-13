import { BookmarkPlus, Columns3, HardDrive } from 'lucide-react'
import { useT } from '@/i18n'
import { CabinMark } from '../shared/CabinMark'
import { TipRow } from './TipRow'

/** The first step: the brand and what TabCabin does, in three lines. */
export function WelcomeStep() {
  const t = useT()
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-[18px] bg-[linear-gradient(160deg,#245541,#1f4a3a_55%,#183b2e)] px-5 py-5 text-[#f4ead5]">
        <CabinMark size={52} tone="cream" />
        <p className="min-w-0 font-display text-[22px] leading-tight font-bold tracking-[-0.02em]">
          {t('onboarding.tagline')}
        </p>
      </div>
      <ul className="flex flex-col gap-3.5">
        <TipRow icon={<Columns3 size={18} />} title={t('onboarding.boardsTitle')}>
          {t('onboarding.boardsText')}
        </TipRow>
        <TipRow icon={<BookmarkPlus size={18} />} title={t('onboarding.saveTitle')}>
          {t('onboarding.saveText')}
        </TipRow>
        <TipRow icon={<HardDrive size={18} />} title={t('onboarding.localTitle')}>
          {t('onboarding.localText')}
        </TipRow>
      </ul>
    </div>
  )
}
