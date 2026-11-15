/**
 * Shift-click on an item that is not picked picks every item from the last one Shift-clicked to
 * this one, in the order the list shows them. Without such an item in the same list (or when it
 * was put back since) only this item is picked. Shift-click on a picked item puts it back.
 */
export function pickItems(
  selection: readonly string[],
  anchor: string | null,
  id: string,
  order: readonly string[],
): string[] {
  if (selection.includes(id)) return selection.filter((s) => s !== id)
  const from = anchor !== null && selection.includes(anchor) ? order.indexOf(anchor) : -1
  const to = order.indexOf(id)
  if (from < 0 || to < 0) return [...selection, id]
  const range = order.slice(Math.min(from, to), Math.max(from, to) + 1)
  return [...selection, ...range.filter((s) => !selection.includes(s))]
}
