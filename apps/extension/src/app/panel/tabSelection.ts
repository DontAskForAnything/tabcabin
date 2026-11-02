/** Ctrl- or Cmd-click picks a tab or puts it back. */
export function toggleTab(selected: readonly number[], id: number): number[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
}

/**
 * Shift-click picks every tab between the last one clicked with a modifier and this one, in the
 * order the panel shows them. When that last tab was just put back, the range is put back too.
 * Without such a tab (or when it is hidden now) only this tab changes.
 */
export function pickRange(
  selected: readonly number[],
  anchor: number | null,
  id: number,
  order: readonly number[],
): number[] {
  const from = anchor === null ? -1 : order.indexOf(anchor)
  const to = order.indexOf(id)
  if (from < 0 || to < 0) return toggleTab(selected, id)
  const range = order.slice(Math.min(from, to), Math.max(from, to) + 1)
  if (!selected.includes(anchor!)) return selected.filter((s) => !range.includes(s))
  return [...selected, ...range.filter((s) => !selected.includes(s))]
}
