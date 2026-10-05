import { presetTime, TIME_PRESETS } from '@tabcabin/core'
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@tabcabin/ui'
import { ChevronDown, Clock, LocateFixed, Pencil, SkipForward, Trash } from 'lucide-react'
import { useT } from '@/i18n'
import type { ReminderActions } from './useReminderActions'

/** The main action of a reminder (done, or remove) and a menu with the rest. */
export function ReminderButtons({
  due,
  repeating,
  actions,
}: {
  due: boolean
  repeating: boolean
  actions: ReminderActions
}) {
  const t = useT()
  const primary = due
    ? { label: repeating ? t('reminders.doneRepeat') : t('reminders.done'), run: actions.done }
    : { label: t('reminders.removeShort'), run: actions.remove }

  return (
    <div className="flex shrink-0 items-center gap-px">
      <Button
        size="sm"
        variant={due ? 'soft' : 'secondary'}
        className="rounded-r-[4px]"
        onClick={() => void primary.run()}
      >
        {primary.label}
      </Button>
      <Menu>
        <MenuTrigger asChild>
          <Button
            size="sm"
            variant={due ? 'soft' : 'secondary'}
            aria-label={t('common.more')}
            className="rounded-l-[4px] px-2"
          >
            <ChevronDown size={14} />
          </Button>
        </MenuTrigger>
        <MenuContent align="end" className="min-w-[210px]">
          {due && (
            <MenuSub>
              <MenuSubTrigger icon={<Clock size={14} />}>{t('reminders.snooze')}</MenuSubTrigger>
              <MenuSubContent>
                {TIME_PRESETS.map((preset) => (
                  <MenuItem
                    key={preset}
                    onSelect={() => void actions.snooze(presetTime(preset, Date.now()))}
                  >
                    {t(`reminders.preset.${preset}`)}
                  </MenuItem>
                ))}
              </MenuSubContent>
            </MenuSub>
          )}
          {!due && repeating && (
            <MenuItem icon={<SkipForward size={14} />} onSelect={() => void actions.done()}>
              {t('reminders.skip')}
            </MenuItem>
          )}
          <MenuItem icon={<Pencil size={14} />} onSelect={actions.edit}>
            {t('reminders.edit')}
          </MenuItem>
          <MenuItem icon={<LocateFixed size={14} />} onSelect={() => void actions.goTo()}>
            {t('reminders.goTo')}
          </MenuItem>
          {due && (
            <>
              <MenuSeparator />
              <MenuItem icon={<Trash size={14} />} danger onSelect={() => void actions.remove()}>
                {repeating ? t('reminders.stop') : t('reminders.remove')}
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>
    </div>
  )
}
