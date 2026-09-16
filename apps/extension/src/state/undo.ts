import { toast } from '@tabhangar/ui'
import { type Result, revert } from '@/db/repo'

let last: { label: string; result: Result } | null = null

/** Shows a toast with an Undo button for a finished operation and remembers it for Ctrl+Z. */
export function offerUndo(
  result: Result,
  message: { title: string; description?: string; undoLabel: string },
) {
  last = { label: message.title, result }
  toast({
    title: message.title,
    description: message.description,
    tone: 'success',
    action: {
      label: message.undoLabel,
      onClick: () => void undoLast(),
    },
  })
}

export async function undoLast(): Promise<boolean> {
  if (!last) return false
  const entry = last
  last = null
  await revert(entry.result)
  return true
}
