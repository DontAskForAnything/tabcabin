import { useT } from '@/i18n'
import { CabinMark } from '@/app/shared/CabinMark'
import { CardHead, PreviewCard, PreviewLink, PreviewTask } from './previews'

/** The left half: a few board cards and the promise, as in the design. */
export function Showcase() {
  const t = useT()
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#5646dc,#4335c4_55%,#382aa8)] p-12 text-white lg:flex">
      <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.14),transparent)]" />
      <div className="relative flex items-center gap-3 text-[20px] font-semibold tracking-[-0.01em]">
        <CabinMark size={44} tone="cream" />
        TabHangar
      </div>

      <div className="relative mx-auto h-[300px] w-full max-w-[520px]" aria-hidden>
        <PreviewCard className="top-[46px] left-0 w-[290px] -rotate-[5deg]">
          <CardHead emoji="🌍" title={t('seed.quickLinks')} meta={t('signin.cardLinks')} />
          <PreviewLink letter="G" color="#24292f" title="Pull requests" />
          <PreviewLink letter="Y" color="#e5484d" title={t('signin.cardWatch')} />
        </PreviewCard>
        <PreviewCard className="top-0 left-[210px] z-10 w-[275px] rotate-[3deg]">
          <CardHead emoji="📥" title={t('seed.today')} meta={t('signin.cardTasks')} />
          <PreviewTask done text={t('signin.task1')} />
          <PreviewTask text={t('signin.task2')} />
          <div className="mt-2 rounded-[10px] bg-[#fde68a] px-3 py-2 text-[12.5px] text-[#5b4a14]">
            {t('signin.task3')}
          </div>
        </PreviewCard>
        <PreviewCard className="top-[200px] left-[100px] w-[262px] rotate-[1deg]">
          <CardHead emoji="📚" title={t('seed.readLater')} meta={t('signin.cardPages')} />
        </PreviewCard>
      </div>

      <div className="relative">
        <h2 className="text-[36px] leading-[1.1] font-semibold tracking-[-0.03em]">
          {t('signin.headline')}
        </h2>
        <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-white/75">
          {t('signin.lead')}
        </p>
      </div>
    </aside>
  )
}
