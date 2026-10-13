import { normalizeUrl } from '@tabcabin/core'
import { Tooltip } from '@tabcabin/ui'
import { Unlink } from 'lucide-react'
import { useT } from '@/i18n'
import { useBoardContext } from '../BoardContext'

/** Whether the page of this address did not load when link checks last looked at it. */
export function useBroken(url: string | null): boolean {
  const broken = useBoardContext()?.broken
  const key = url ? normalizeUrl(url) : null
  return Boolean(key && broken?.has(key))
}

/** A small, quiet mark next to a link whose page no longer loads. */
export function BrokenMark() {
  const t = useT()
  return (
    <Tooltip label={t('links.broken')}>
      <span
        role="img"
        aria-label={t('links.broken')}
        className="inline-flex shrink-0 items-center text-ink-4"
      >
        <Unlink size={12} />
      </span>
    </Tooltip>
  )
}
