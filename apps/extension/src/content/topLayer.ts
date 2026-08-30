/**
 * Moves a content-script UI host into the browser's top layer (Popover API), above every
 * element of the page whatever its z-index. The host covers the viewport but lets clicks
 * through; the UI inside opts back in with `pointer-events: auto`.
 */
export function showInTopLayer(host: HTMLElement) {
  const style: Record<string, string> = {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    'max-width': 'none',
    'max-height': 'none',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
    overflow: 'visible',
    'pointer-events': 'none',
    'z-index': '2147483647',
  }
  for (const [name, value] of Object.entries(style))
    host.style.setProperty(name, value, 'important')
  host.setAttribute('popover', 'manual')
  try {
    host.showPopover()
  } catch {
    // Popover API unavailable: the fixed position and z-index above still apply.
  }
}
