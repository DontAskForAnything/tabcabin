import { toast } from '@tabcabin/ui'
import { useBrokenLinks } from '@/db/linkChecks'
import { useT } from '@/i18n'
import { ALL_SITES } from '@/lib/allSites'
import { type Settings, updateSettings } from '@/settings/settings'
import { SwitchRow } from './Row'

/**
 * Turns link checks on (asking for access to the saved sites first) or off (giving the access
 * back). While on, says how many links no longer load.
 */
export function LinkChecksRow({ settings }: { settings: Settings }) {
  const t = useT()
  const broken = useBrokenLinks(settings.checkLinks)

  const toggle = async (on: boolean) => {
    if (!on) {
      await updateSettings({ checkLinks: false })
      await browser.permissions.remove(ALL_SITES).catch(() => false)
      return
    }
    const granted = await browser.permissions.request(ALL_SITES).catch(() => false)
    if (!granted) {
      toast({ title: t('links.denied'), tone: 'info' })
      return
    }
    await updateSettings({ checkLinks: true })
    void browser.runtime.sendMessage({ type: 'tabcabin:check-links' }).catch(() => undefined)
  }

  const hint = settings.checkLinks
    ? [
        t('settings.checkLinksOn'),
        broken.size ? t('settings.checkLinksCount', { count: broken.size }) : '',
      ]
        .filter(Boolean)
        .join(' ')
    : t('settings.checkLinksHint')

  return (
    <SwitchRow
      label={t('settings.checkLinks')}
      hint={hint}
      checked={settings.checkLinks}
      onChange={(on) => void toggle(on)}
    />
  )
}
