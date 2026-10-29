import { ChevronDown, X } from 'lucide-react'
import { IconButton, Menu, MenuContent, MenuTrigger } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { closeTabs } from '@/lib/tabs'
import type { ActiveContext } from '../../useActive'
import { saveTabs } from '../saveTabs'
import { SaveToMenuItems } from '../SaveToMenu'
import type { OpenTab } from '../useOpenTabs'
import type { dragSourceFor } from './dragSource'

/** "Save ▾" and close, shown while hovering a tab row. */
export function TabHoverActions({
  tab,
  source,
  active,
}: {
  tab: OpenTab
  source: ReturnType<typeof dragSourceFor>
  active: ActiveContext
}) {
  const t = useT()
  const options = { t, settings: active.settings }
  return (
    // Stays while its menu is open: the menu would lose its place if the button went away.
    <div
      className="hidden shrink-0 items-center gap-1 group-focus-within/tab:flex group-hover/tab:flex has-[[data-state=open]]:flex"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="flex h-[26px] items-center gap-1 rounded-[7px] bg-subtle px-2 text-[12px] font-semibold text-ink-2 hover:text-ink"
          >
            {t('common.save')}
            <ChevronDown size={12} />
          </button>
        </MenuTrigger>
        <MenuContent
          align="end"
          className="min-w-[230px]"
          onClick={(event) => event.stopPropagation()}
        >
          <SaveToMenuItems
            active={active}
            onPick={(groupId) => void saveTabs(source.tabs, { groupId }, options)}
            onNewGroup={(categoryId) =>
              void saveTabs(source.tabs, { newGroupIn: categoryId }, options)
            }
          />
        </MenuContent>
      </Menu>
      <IconButton
        label={t('tab.close')}
        icon={<X size={13} />}
        size="xs"
        variant="soft"
        tooltip={false}
        onClick={(event) => {
          event.stopPropagation()
          void closeTabs([tab.id])
        }}
      />
    </div>
  )
}
