import { Button, Modal, toast } from '@tabcabin/ui'
import { Copy, ExternalLink, Link2 } from 'lucide-react'
import { type Translate, useT } from '@/i18n'
import { copyText } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { useShare } from './useShare'

function errorText(code: string, t: Translate): string {
  if (code === 'network') return t('share.offline')
  if (code === 'not_synced') return t('share.notSynced')
  if (code === 'too_many_shares') return t('share.tooMany')
  return t('share.failed', { reason: code })
}

/** A read-only link to one group, for people without TabCabin. */
export function ShareDialog() {
  const t = useT()
  const modal = useUi((s) => s.modal)
  const close = useUi((s) => s.closeModal)
  const target = modal?.type === 'share' ? modal : null
  const { state, create, stop } = useShare(target?.groupId ?? null)

  const copy = async (url: string) => {
    if (await copyText(url)) toast({ title: t('share.copied'), tone: 'success' })
  }

  return (
    <Modal
      open={target !== null}
      onOpenChange={(value) => !value && close()}
      title={t('share.title')}
      description={target?.title}
      size="md"
      footer={
        state.status === 'shared' ? (
          <>
            <Button variant="ghost" className="mr-auto text-danger" onClick={() => void stop()}>
              {t('share.stop')}
            </Button>
            <Button variant="primary" onClick={close}>
              {t('common.done')}
            </Button>
          </>
        ) : state.status === 'none' ? (
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon={<Link2 size={15} />} onClick={() => void create()}>
              {t('share.create')}
            </Button>
          </>
        ) : undefined
      }
    >
      <p className="text-[14px] leading-relaxed text-ink-2">{t('share.explain')}</p>
      {state.status === 'loading' && (
        <p className="mt-4 text-[13.5px] text-ink-3">{t('share.loading')}</p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="mt-4 text-[13.5px] font-medium text-danger">
          {errorText(state.code, t)}
        </p>
      )}
      {state.status === 'shared' && (
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={state.url}
            aria-label={t('share.link')}
            onFocus={(event) => event.target.select()}
            className="h-10 min-w-0 flex-1 rounded-[11px] bg-subtle px-3 font-mono text-[12.5px] text-ink-2 outline-none focus-visible:shadow-[0_0_0_2px_var(--focus)]"
          />
          <Button icon={<Copy size={14} />} onClick={() => void copy(state.url)}>
            {t('share.copy')}
          </Button>
          <Button
            variant="ghost"
            icon={<ExternalLink size={14} />}
            aria-label={t('share.open')}
            onClick={() => void browser.tabs.create({ url: state.url })}
          />
        </div>
      )}
    </Modal>
  )
}
