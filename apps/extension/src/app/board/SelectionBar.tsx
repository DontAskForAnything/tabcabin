import { Layers, SquareStack, Trash, X } from 'lucide-react'
import { Button, IconButton } from '@tabhangar/ui'
import { AnimatePresence, motion } from 'motion/react'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { openAsTabGroup } from '@/lib/browser'
import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { useBoardActions } from './actions'

export function SelectionBar({ active }: { active: ActiveContext }) {
  const t = useT()
  const selection = useUi((s) => s.selection)
  const clear = useUi((s) => s.clearSelection)
  const actions = useBoardActions(active)

  const stack = async () => {
    const [target, ...rest] = selection
    if (target && rest.length) await actions.combine(rest, target)
  }
  const open = async () => {
    const items = (await db.items.bulkGet(selection)).filter((item) => !!item)
    await openAsTabGroup(items.map((item) => item.url).filter((url): url is string => !!url))
  }

  return (
    <AnimatePresence>
      {selection.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 12, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-40 flex items-center gap-1.5 rounded-2xl bg-card p-1.5 pl-4 shadow-pop"
        >
          <span className="mr-2 text-[13px] font-semibold">
            {t('selection.count', { count: selection.length })}
          </span>
          <Button
            size="sm"
            variant="soft"
            icon={<SquareStack size={14} />}
            disabled={selection.length < 2}
            onClick={() => void stack()}
          >
            {t('selection.stack')}
          </Button>
          <Button size="sm" variant="soft" icon={<Layers size={14} />} onClick={() => void open()}>
            {t('selection.open')}
          </Button>
          <Button
            size="sm"
            variant="soft"
            icon={<Trash size={14} />}
            onClick={() => void actions.deleteItems(selection)}
          >
            {t('item.delete')}
          </Button>
          <IconButton
            label={t('selection.clear')}
            icon={<X size={15} />}
            size="md"
            onClick={clear}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
