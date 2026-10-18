import { Button, Field, Modal, Textarea, toast } from '@tabcabin/ui'
import { Info, LoaderCircle, Send } from 'lucide-react'
import { type FormEvent, useEffect, useId, useState } from 'react'
import { askLater, stopAsking } from '@/feedback/ask'
import { sendFeedback, takesFeedback } from '@/feedback/send'
import { useLocale, useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useSyncServer } from '@/sync/server'
import { RateLink } from './RateLink'
import { useReviewsUrl } from './useReviewsUrl'

const MAX_LENGTH = 2000

/**
 * "Tell me what to improve": a message (and an address for an answer, if wanted) that the sync
 * server passes on to the developer. Only the version and the language go with it.
 */
export function FeedbackDialog({ open, fromCard }: { open: boolean; fromCard: boolean }) {
  const t = useT()
  const locale = useLocale()
  const formId = useId()
  const close = useUi((s) => s.closeModal)
  const server = useSyncServer()
  const reviews = useReviewsUrl()
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [off, setOff] = useState(false)

  useEffect(() => {
    if (open && server) void takesFeedback(server).then((on) => setOff(!on))
  }, [open, server])

  const dismiss = () => {
    if (sending) return
    close()
    if (fromCard) void askLater()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!server || !text.trim() || sending) return
    setSending(true)
    const result = await sendFeedback(server, {
      text: text.trim(),
      email: email.trim(),
      language: locale,
    })
    setSending(false)
    if (result === 'sent') {
      toast({ title: t('feedback.sent'), tone: 'success' })
      setText('')
      setEmail('')
      close()
      void stopAsking()
    } else if (result === 'off') setOff(true)
    else
      toast({ title: t(result === 'limit' ? 'feedback.limit' : 'feedback.failed'), tone: 'error' })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && dismiss()}
      title={t('feedback.write')}
      description={off ? undefined : t('feedback.writeHint')}
      size="md"
      footer={
        <>
          {reviews && <RateLink url={reviews} onRate={close} />}
          {off ? (
            <Button onClick={dismiss}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={dismiss}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                form={formId}
                variant="primary"
                disabled={!text.trim() || sending}
                icon={
                  sending ? (
                    <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Send size={15} />
                  )
                }
              >
                {t('feedback.send')}
              </Button>
            </>
          )}
        </>
      }
    >
      {off ? (
        <p className="text-[13.5px] text-ink-2">{t('feedback.off')}</p>
      ) : (
        <form id={formId} onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">{t('feedback.message')}</span>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={MAX_LENGTH}
              autoGrow={false}
              autoFocus
              className="min-h-[140px] rounded-xl border border-line bg-card px-3.5 py-3 text-[14.5px] text-ink shadow-tile focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
            />
            <span className="self-end text-[12px] text-ink-3 tabular-nums">
              {text.length} / {MAX_LENGTH}
            </span>
          </label>
          <Field
            label={t('feedback.email')}
            type="email"
            autoComplete="email"
            placeholder={t('feedback.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="flex gap-2 text-[12.5px] leading-normal text-ink-3">
            <Info size={14} className="mt-[3px] shrink-0" aria-hidden />
            {t('feedback.privacy')}
          </p>
        </form>
      )}
    </Modal>
  )
}
