import { Pin, PinOff } from 'lucide-react'
import { IconButton } from '@tabhangar/ui'
import { HangarMark } from '@/app/shared/HangarMark'
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
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-accent text-white shadow-glow">
        <HangarMark size={19} />
      </span>
      <span className="flex-1 text-[16px] font-semibold tracking-[-0.02em]">TabHangar</span>
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
