import { Pin, PinOff } from 'lucide-react'
import { IconButton } from '@tabcabin/ui'
import { CabinMark } from '@/app/shared/CabinMark'
import { useT } from '@/i18n'
import { updateSettings } from '@/settings/settings'

/** Logo, name and the button that pins the panel or folds it into the icon rail. */
export function PanelHeader({
  pinned,
  onPinChange,
}: {
  pinned: boolean
  onPinChange?: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-2.5 px-1">
      <CabinMark size={34} />
      <span className="flex-1 font-display text-[18px] font-bold tracking-[-0.02em]">TabCabin</span>
      <IconButton
        label={pinned ? t('panel.unpin') : t('panel.pin')}
        icon={pinned ? <PinOff size={15} /> : <Pin size={15} />}
        variant={pinned ? 'accent' : 'soft'}
        size="md"
        onClick={() => {
          void updateSettings({ sidebarMode: pinned ? 'rail' : 'pinned' })
          onPinChange?.()
        }}
      />
    </div>
  )
}
