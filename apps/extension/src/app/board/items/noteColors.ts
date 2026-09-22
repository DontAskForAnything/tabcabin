export function noteColors(color: string | null) {
  return color
    ? { background: `var(--note-${color}-bg)`, color: `var(--note-${color}-ink)` }
    : { background: 'var(--subtle)', color: 'var(--ink)' }
}
