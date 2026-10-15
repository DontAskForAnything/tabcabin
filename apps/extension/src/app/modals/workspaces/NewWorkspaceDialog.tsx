import { Button, EmojiPickerPopover, Field, Modal } from '@tabcabin/ui'
import { useEffect, useRef, useState } from 'react'
import { TEMPLATES, type TemplateId, templateWorkspace } from '@/data/templates'
import { createWorkspace } from '@/db/repo'
import { useLocale, useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { setActiveCategory, type ActiveContext } from '../../useActive'
import { TemplatePicker } from './TemplatePicker'

const DEFAULT_EMOJI = '📦'

/**
 * Names a new workspace, picks its icon and, if wanted, a template before creating it, then
 * switches to it.
 */
export function NewWorkspaceDialog({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const locale = useLocale()
  const close = useUi((s) => s.closeModal)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
  const [emojiPicked, setEmojiPicked] = useState(false)
  const [templateId, setTemplateId] = useState<TemplateId | null>(null)
  const nameField = useRef<HTMLInputElement>(null)
  const template = TEMPLATES.find((item) => item.id === templateId)
  const fallbackName = template
    ? template.name[locale]
    : t('workspace.defaultName', { n: (active.workspaces?.length ?? 0) + 1 })

  useEffect(() => {
    if (!open) return
    setName('')
    setEmoji(DEFAULT_EMOJI)
    setEmojiPicked(false)
    setTemplateId(null)
  }, [open])

  const chooseTemplate = (id: TemplateId | null) => {
    setTemplateId(id)
    // The template's icon, unless one was picked by hand.
    if (!emojiPicked) setEmoji(TEMPLATES.find((item) => item.id === id)?.emoji ?? DEFAULT_EMOJI)
  }

  const create = async () => {
    const result = await createWorkspace({
      ...(template
        ? templateWorkspace(template, locale, t)
        : { categoryName: t('category.defaultName') }),
      name: name.trim() || fallbackName,
      emoji,
    })
    if (active.settings)
      await setActiveCategory(active.settings, result.workspaceId, result.categoryId)
    close()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('workspace.new')}
      size="sm"
      initialFocus={nameField}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="new-workspace" variant="primary">
            {t('workspace.create')}
          </Button>
        </>
      }
    >
      <form
        id="new-workspace"
        className="flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <EmojiPickerPopover
          onSelect={(value) => {
            setEmoji(value)
            setEmojiPicked(true)
          }}
          emojibaseUrl={emojiBaseUrl()}
        >
          <button
            type="button"
            aria-label={t('workspace.changeEmoji')}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-[22px] leading-none shadow-tile transition-colors outline-none hover:bg-subtle focus-visible:shadow-[0_0_0_2px_var(--focus)]"
          >
            {emoji}
          </button>
        </EmojiPickerPopover>
        <Field
          ref={nameField}
          label={t('workspace.name')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={fallbackName}
          className="min-w-0 flex-1"
        />
      </form>
      <TemplatePicker value={templateId} onChange={chooseTemplate} />
    </Modal>
  )
}
