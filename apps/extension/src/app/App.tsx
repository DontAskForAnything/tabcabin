import { Toaster, TooltipProvider, useApplyTheme } from '@tabhangar/ui'
import { useEffect } from 'react'
import { ensureSeed } from '@/db/seed'
import { I18nProvider, type Translate } from '@/i18n'
import { translate } from '@/i18n/translate'
import { DEFAULT_SETTINGS, updateSettings } from '@/settings/settings'
import { Shell } from './Shell'
import type { Surface } from './mount'
import { useActive } from './useActive'

const seedText = (t: Translate) => ({
  workspace: t('seed.workspace'),
  categories: [t('seed.today'), t('seed.readLater'), t('seed.projects')] as [
    string,
    string,
    string,
  ],
  quickLinks: t('seed.quickLinks'),
  todo: t('seed.todo'),
  welcome: t('seed.welcome'),
  readLater: t('seed.articles'),
  tasks: [t('seed.task1'), t('seed.task2'), t('seed.task3')] as [string, string, string],
  doneTask: t('seed.doneTask'),
  welcomeNote: t('seed.welcomeNote'),
  tipNote: t('seed.tipNote'),
})

export function App({ surface }: { surface: Surface }) {
  const active = useActive()
  const settings = active.settings ?? DEFAULT_SETTINGS
  useApplyTheme(settings.theme)
  useEffect(() => {
    document.documentElement.dataset.density = settings.density
  }, [settings.density])

  useEffect(() => {
    const locale = DEFAULT_SETTINGS.locale
    void ensureSeed(seedText((key, params) => translate(locale, key, params))).then(
      (workspaceId) => {
        if (workspaceId) void updateSettings({ activeWorkspaceId: workspaceId })
      },
    )
  }, [])

  return (
    <I18nProvider locale={settings.locale}>
      <TooltipProvider>
        <Shell surface={surface} active={active} />
        <Toaster />
      </TooltipProvider>
    </I18nProvider>
  )
}
