import type { MessageKey } from '@/i18n'

/** Where the palette searches; Tab cycles through them. */
export type Scope = 'workspace' | 'all' | 'tabs' | 'bookmarks'

export const SCOPES: { value: Scope; label: MessageKey }[] = [
  { value: 'workspace', label: 'search.scopeWorkspace' },
  { value: 'all', label: 'search.scopeAll' },
  { value: 'tabs', label: 'search.scopeTabs' },
  { value: 'bookmarks', label: 'search.scopeBookmarks' },
]

export function nextScope(scope: Scope, backwards: boolean): Scope {
  const at = SCOPES.findIndex((s) => s.value === scope)
  return SCOPES[(at + (backwards ? SCOPES.length - 1 : 1)) % SCOPES.length]!.value
}
