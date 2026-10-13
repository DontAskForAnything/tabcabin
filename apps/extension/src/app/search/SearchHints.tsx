import { useT } from '@/i18n'
import { KeyHint } from './KeyHint'

/** The keyboard cheat line at the bottom of the palette. */
export function SearchHints() {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-4 border-t border-line bg-subtle/70 px-5 py-3 text-[12px] text-ink-3">
      <KeyHint keys={['↑', '↓']}>{t('search.hintSelect')}</KeyHint>
      <KeyHint keys={['↵']}>{t('search.hintOpen')}</KeyHint>
      <KeyHint keys={['Ctrl ↵']}>{t('search.hintGoTo')}</KeyHint>
      <KeyHint keys={['→']}>{t('search.hintMove')}</KeyHint>
      <KeyHint keys={['Tab']}>{t('search.hintScope')}</KeyHint>
    </div>
  )
}
