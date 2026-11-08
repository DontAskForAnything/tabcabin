/** An element with classes and, optionally, text (never HTML: shared groups are other people's text). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** "github.com" for a web address, the text itself for anything else. */
export function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '') || url
  } catch {
    return url
  }
}
