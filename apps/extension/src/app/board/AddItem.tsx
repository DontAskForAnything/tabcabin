import { Plus } from 'lucide-react'
import { Textarea } from '@tabhangar/ui'
import { useState } from 'react'
import { useT } from '@/i18n'
import type { BoardActions } from './actions'

/** "Note or link" button that turns into an input; URLs become links, anything else a note. */
export function AddItem({ groupId, actions }: { groupId: string; actions: BoardActions }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const submit = async (keepOpen: boolean) => {
    const text = value.trim()
    setValue('')
    if (text) await actions.addFromText(groupId, text)
    if (!keepOpen) setOpen(false)
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-line text-[13px] font-medium text-ink-3 transition-colors hover:border-accent/40 hover:bg-subtle hover:text-ink-2"
      >
        <Plus size={14} />
        {t('item.add')}
      </button>
    )

  return (
    <div className="mt-2.5 rounded-xl bg-subtle px-3 py-2 shadow-[0_0_0_2px_var(--focus)]">
      <Textarea
        autoFocus
        value={value}
        placeholder={t('item.addPlaceholder')}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void submit(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submit(true)
          }
          if (event.key === 'Escape') {
            setValue('')
            setOpen(false)
          }
        }}
        className="text-[14px]"
      />
    </div>
  )
}
