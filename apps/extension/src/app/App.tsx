import { Toaster, TooltipProvider, UiTextProvider, useApplyTheme } from '@tabcabin/ui'
import { MotionConfig } from 'motion/react'
import { type ReactNode, useEffect } from 'react'
import { ensureSeed } from '@/db/seed'
import { I18nProvider, useLocale, useT } from '@/i18n'
import { translate } from '@/i18n/translate'
import { DEFAULT_SETTINGS, updateSettings } from '@/settings/settings'
import { seedText } from './seedText'
import { Shell } from './Shell'
import { StartOver } from './StartOver'
import { SignInPage } from './signin/SignInPage'
import type { Surface } from './mount'
import { useActive } from './useActive'

export function App({ surface }: { surface: Surface }) {
  const active = useActive()
  const settings = active.settings ?? DEFAULT_SETTINGS
  useApplyTheme(settings.theme)
  useEffect(() => {
    document.documentElement.dataset.density = settings.density
  }, [settings.density])

  useEffect(() => {
    // Wake the background so it pulls changes made on other computers.
    if (typeof browser !== 'undefined' && browser.runtime?.id)
      void browser.runtime.sendMessage({ type: 'tabcabin:sync-now' }).catch(() => undefined)
  }, [])

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
      <ComponentText>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            {surface === 'signin' ? <SignInPage /> : <Shell surface={surface} active={active} />}
            <Toaster />
            <StartOver />
          </TooltipProvider>
        </MotionConfig>
      </ComponentText>
    </I18nProvider>
  )
}

/** Translations for texts rendered inside the shared UI components. */
function ComponentText({ children }: { children: ReactNode }) {
  const t = useT()
  const locale = useLocale()
  return (
    <UiTextProvider
      text={{
        locale,
        close: t('common.close'),
        dismiss: t('common.dismiss'),
        searchEmoji: t('emoji.search'),
        noEmoji: t('emoji.empty'),
        showPassword: t('sync.showPassword'),
        hidePassword: t('sync.hidePassword'),
      }}
    >
      {children}
    </UiTextProvider>
  )
}
