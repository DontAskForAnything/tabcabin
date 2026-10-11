import { Button, EmojiPickerPopover, Field, Modal } from '@tabcabin/ui'
import { useEffect, useRef, useState } from 'react'
import { createWorkspace } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { setActiveCategory, type ActiveContext } from '../../useActive'

const DEFAULT_EMOJI = '📦'

/** Names a new workspace and picks its icon before creating it, then switches to it. */
export function NewWorkspaceDialog({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
  const nameField = useRef<HTMLInputElement>(null)
  const fallbackName = t('workspace.defaultName', { n: (active.workspaces?.length ?? 0) + 1 })

  useEffect(() => {
    if (!open) return
    setName('')
    setEmoji(DEFAULT_EMOJI)
  }, [open])

  const create = async () => {
    const result = await createWorkspace({
      name: name.trim() || fallbackName,
      emoji,
      categoryName: t('category.defaultName'),
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
        <EmojiPickerPopover onSelect={setEmoji} emojibaseUrl={emojiBaseUrl()}>
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
    </Modal>
  )
}
