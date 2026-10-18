import { Button } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, MessageSquare, Star } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import { askLater, getAsk, isDue, noteVisit, stopAsking } from '@/feedback/ask'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useSyncServer } from '@/sync/server'
import { CabinMark } from '../shared/CabinMark'
import { useReviewsUrl } from './useReviewsUrl'

/**
 * After two weeks of use, a quiet card in the corner of the new tab asks once how TabCabin is
 * working. Rating and writing are offered side by side, to everyone, whatever they think of it.
 */
export function FeedbackCard() {
  const t = useT()
  const titleId = useId()
  const ask = useLiveQuery(getAsk, [])
  const formOpen = useUi((s) => s.modal?.type === 'feedback')
  const server = useSyncServer()
  const reviews = useReviewsUrl()
  const [now] = useState(Date.now)

  useEffect(() => {
    void noteVisit()
  }, [])

  const shown = isDue(ask, now) && !formOpen && (!!reviews || !!server)

  return (
    <AnimatePresence>
      {shown && (
        <motion.section
          aria-labelledby={titleId}
          className="fixed right-6 bottom-6 z-40 flex w-[360px] flex-col gap-4 rounded-[18px] bg-raised p-[18px] text-ink shadow-pop"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <div className="flex items-start gap-3">
            <CabinMark size={36} />
            <div className="flex min-w-0 flex-col gap-1">
              <h2
                id={titleId}
                className="text-[15.5px] leading-snug font-semibold tracking-[-0.01em]"
              >
                {t('feedback.question')}
              </h2>
              <p className="text-[13px] leading-[1.45] text-ink-3">
                {t(ask?.state === 'later' ? 'feedback.questionHintAgain' : 'feedback.questionHint')}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {reviews && (
              <a
                href={reviews}
                target="_blank"
                rel="noreferrer"
                onClick={() => void stopAsking()}
                className="flex h-10 items-center justify-center gap-2 rounded-[11px] bg-accent text-[13.5px] font-semibold text-on-accent shadow-glow outline-none hover:brightness-110 focus-visible:shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--focus)]"
              >
                <Star size={15} aria-hidden />
                {t('feedback.rate')}
                <ExternalLink size={13} aria-hidden className="opacity-75" />
              </a>
            )}
            <div className="flex gap-2">
              {server && (
                <Button
                  className="flex-1"
                  icon={<MessageSquare size={15} />}
                  onClick={() => useUi.getState().openModal({ type: 'feedback', fromCard: true })}
                >
                  {t('feedback.write')}
                </Button>
              )}
              <Button
                variant="ghost"
                className={server ? '' : 'flex-1'}
                onClick={() => void askLater()}
              >
                {t('feedback.notNow')}
              </Button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
