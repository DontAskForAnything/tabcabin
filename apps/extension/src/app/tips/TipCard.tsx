import { Button, IconButton } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useEffect, useId, useMemo, useState } from 'react'
import { getAsk, isDue as feedbackDue } from '@/feedback/ask'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useSyncServer } from '@/sync/server'
import { useAccount } from '@/sync/state'
import { useReviewsUrl } from '../feedback/useReviewsUrl'
import { useCommandShortcut } from '../shared/useCommandShortcut'
import type { ActiveContext } from '../useActive'
import { availableTips, TIPS } from './catalog'
import { runTipAction } from './runTipAction'
import { dueTip, getTips, putAway, startTips } from './schedule'
import { TipVisual } from './TipVisual'

/** Waits a moment after the page opens, so the card does not flash in with the board. */
const SHOW_AFTER_MS = 1200

/**
 * Now and then a card in the corner of the new tab shows one thing TabCabin can do. Never next
 * to a dialog or the feedback question; Settings → General turns it off.
 */
export function TipCard({ active }: { active: ActiveContext }) {
  const t = useT()
  const titleId = useId()
  const state = useLiveQuery(getTips, [])
  const ask = useLiveQuery(getAsk, [])
  const modal = useUi((s) => s.modal)
  const account = useAccount()
  const server = useSyncServer()
  const reviews = useReviewsUrl()
  const saveKeys = useCommandShortcut('_execute_action')
  const inboxKeys = useCommandShortcut('save-to-inbox')
  const [now] = useState(Date.now)
  const [waited, setWaited] = useState(false)
  const settings = active.settings

  useEffect(() => {
    void startTips()
    const timer = setTimeout(() => setWaited(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  const signedIn = Boolean(account?.token)
  const tips = useMemo(
    () =>
      settings && account !== undefined
        ? availableTips(TIPS, {
            settings,
            signedIn,
            canSignIn: Boolean(server) && !signedIn,
            commands: { _execute_action: saveKeys, 'save-to-inbox': inboxKeys },
          })
        : [],
    [settings, account, signedIn, server, saveKeys, inboxKeys],
  )
  const tip = dueTip(tips, state, now)
  // The feedback card takes the same corner (it shows only where it can rate or send).
  const feedbackShown = feedbackDue(ask, now) && (!!reviews || !!server)
  const shown = !!tip && !!settings?.showTips && waited && modal === null && !feedbackShown

  const close = () => tip && void putAway(tip.id, { wait: true })
  const next = () => tip && void putAway(tip.id, { wait: false })
  const act = () => {
    if (!tip || !settings) return
    void putAway(tip.id, { wait: true })
    if (tip.action) runTipAction(tip.action, { settings, categoryId: active.category?.id })
  }

  return (
    // "Next tip" lets one card leave before the next comes in.
    <AnimatePresence mode="wait">
      {shown && (
        <motion.section
          key={tip.id}
          aria-labelledby={titleId}
          className="fixed right-6 bottom-6 z-40 flex w-[300px] flex-col overflow-hidden rounded-[18px] bg-raised text-ink shadow-pop"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <div className="relative">
            <TipVisual keys={tip.keys} icon={tip.icon} />
            <IconButton
              label={t('tips.close')}
              icon={<X size={15} />}
              size="sm"
              className="absolute top-2 right-2 text-accent-ink hover:bg-card/60"
              onClick={close}
            />
          </div>
          <div className="flex flex-col gap-3 px-4 pt-3.5 pb-3.5">
            <div className="flex flex-col gap-1">
              <h2
                id={titleId}
                className="text-[11.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase"
              >
                {t('tips.label')}
              </h2>
              <p className="text-[14px] leading-[1.5]">
                <TipText text={t(tip.text, { keys: tip.keys ?? '' })} keys={tip.keys} />
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" className="text-ink-3" onClick={next}>
                {t('tips.next')}
              </Button>
              <Button
                size="sm"
                variant="soft"
                className="bg-accent-soft text-accent-ink hover:bg-accent-soft"
                onClick={tip.action ? act : close}
              >
                {t(tip.action ? actionLabel[tip.action] : 'tips.gotIt')}
              </Button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

const actionLabel = {
  search: 'tips.tryIt',
  collections: 'tips.tryIt',
  bin: 'tips.openBin',
  shortcuts: 'tips.showShortcuts',
  appearance: 'tips.openSettings',
  general: 'tips.openSettings',
  account: 'sync.signIn',
} as const

/** The tip's text with its keys set as keycaps. */
function TipText({ text, keys }: { text: string; keys?: string }) {
  if (!keys) return text
  const parts = text.split(keys)
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <kbd className="rounded-md bg-subtle px-1.5 py-px font-mono text-[12.5px] whitespace-nowrap text-ink">
          {keys}
        </kbd>
      )}
      {part}
    </Fragment>
  ))
}
