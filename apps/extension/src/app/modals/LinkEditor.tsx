import { Trash } from 'lucide-react'
import { NOTE_COLORS, type NoteColor, withProtocol } from '@tabcabin/core'
import { Button, cn, Field, Modal, Textarea, toast } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '@/db/db'
import { deleteItems, updateItem } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'

export function LinkEditor({ itemId }: { itemId: string | null }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const item = useLiveQuery(() => (itemId ? db.items.get(itemId) : undefined), [itemId])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [color, setColor] = useState<NoteColor | null>(null)
  const [image, setImage] = useState('')

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setUrl(item.url ?? '')
    setText(item.text)
    setColor(item.color)
    setImage(item.metaImageUrl ?? '')
  }, [item])

  const save = async () => {
    if (!item) return
    await updateItem(item.id, {
      title: title.trim(),
      url: url.trim() ? withProtocol(url) : item.url,
      text: text.trim(),
      color,
      metaImageUrl: image.trim() || null,
    })
    toast({ title: t('editor.saved'), tone: 'success' })
    close()
  }

  return (
    <Modal
      open={itemId !== null && !!item}
      onOpenChange={(open) => !open && close()}
      title={t('editor.title')}
      footer={
        <>
          <Button
            variant="ghost"
            icon={<Trash size={15} />}
            className="mr-auto text-danger hover:bg-danger-soft hover:text-danger"
            onClick={() => {
              if (item) void deleteItems([item.id])
              close()
            }}
          >
            {t('item.delete')}
          </Button>
          <Button variant="ghost" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Field
          label={t('editor.name')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Field
          label={t('editor.url')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-2">{t('editor.comment')}</span>
          <div
            className="rounded-xl px-3.5 py-2.5"
            style={{
              background: `var(--note-${color ?? 'sky'}-bg)`,
              color: `var(--note-${color ?? 'sky'}-ink)`,
            }}
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('editor.commentPlaceholder')}
              className="min-h-[44px] placeholder:text-current placeholder:opacity-50"
            />
          </div>
          <div className="flex gap-1.5 pt-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={t(`color.${c}`)}
                onClick={() => setColor(c)}
                className={cn(
                  'size-6 rounded-[8px] shadow-[inset_0_0_0_1px_rgb(20_24_40/0.1)]',
                  (color ?? 'sky') === c &&
                    'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]',
                )}
                style={{ background: `var(--note-${c}-bg)` }}
              />
            ))}
          </div>
        </div>
        <Field
          label={t('editor.image')}
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://…"
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
