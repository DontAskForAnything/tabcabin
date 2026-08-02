import { useEffect } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const query = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return query()?.matches ? 'dark' : 'light'
}

export function applyTheme(
  preference: ThemePreference,
  root: HTMLElement = document.documentElement,
) {
  const resolved = resolveTheme(preference)
  root.classList.toggle('dark', resolved === 'dark')
  return resolved
}

/** Keeps the `.dark` class on <html> in sync with the preference (and the OS when "system"). */
export function useApplyTheme(preference: ThemePreference) {
  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') return
    const media = query()
    if (!media) return
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])
}
