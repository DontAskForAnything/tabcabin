import {
  BookmarkPlus,
  Ellipsis,
  Keyboard,
  Monitor,
  Moon,
  Plus,
  Settings,
  Sun,
  SunMoon,
  Trash,
} from 'lucide-react'
import {
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  type ThemePreference,
} from '@tabhangar/ui'
import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import { setSetting } from '@/settings/settings'
import { useUi } from '@/state/ui'
import { useBoardActions } from '../board/actions'
import type { ActiveContext } from '../useActive'

export function MoreMenu({ active }: { active: ActiveContext }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const actions = useBoardActions(active)
  const theme = active.settings?.theme ?? 'system'
  const themes: { value: ThemePreference; label: string; icon: ReactNode }[] = [
    { value: 'light', label: t('menu.themeLight'), icon: <Sun size={15} /> },
    { value: 'dark', label: t('menu.themeDark'), icon: <Moon size={15} /> },
    { value: 'system', label: t('menu.themeSystem'), icon: <Monitor size={15} /> },
  ]
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label={t('menu.more')}
          icon={<Ellipsis size={18} />}
          size="lg"
          tooltip={false}
        />
      </MenuTrigger>
      <MenuContent align="end" className="min-w-[230px]">
        <MenuItem
          icon={<Plus size={15} />}
          shortcut="G"
          onSelect={() => void actions.createGroup()}
        >
          {t('group.new')}
        </MenuItem>
        <MenuSeparator />
        <MenuSub>
          <MenuSubTrigger icon={<SunMoon size={15} />}>{t('menu.theme')}</MenuSubTrigger>
          <MenuSubContent>
            {themes.map((option) => (
              <MenuItem
                key={option.value}
                icon={option.icon}
                shortcut={option.value === theme ? '✓' : undefined}
                onSelect={() => void setSetting('theme', option.value)}
              >
                {option.label}
              </MenuItem>
            ))}
          </MenuSubContent>
        </MenuSub>
        <MenuItem
          icon={<BookmarkPlus size={15} />}
          onSelect={() => openModal({ type: 'bookmarks' })}
        >
          {t('menu.import')}
        </MenuItem>
        <MenuItem icon={<Trash size={15} />} onSelect={() => openModal({ type: 'bin' })}>
          {t('menu.bin')}
        </MenuItem>
        <MenuItem icon={<Keyboard size={15} />} onSelect={() => openModal({ type: 'shortcuts' })}>
          {t('menu.shortcuts')}
        </MenuItem>
        <MenuItem icon={<Settings size={15} />} onSelect={() => openModal({ type: 'settings' })}>
          {t('menu.settings')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
