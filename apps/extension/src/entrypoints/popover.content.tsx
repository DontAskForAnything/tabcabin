import { createRoot, type Root } from 'react-dom/client'
import { isRuntimeMessage } from '@/messages'
import { PagePopover } from '@/content/PagePopover'
import contentCss from '@/content/content.css?inline'
import { showInTopLayer } from '@/content/topLayer'

export default defineContentScript({
  // Injected on demand through `activeTab` (no host permissions, no web-accessible CSS).
  registration: 'runtime',
  cssInjectionMode: 'manual',
  async main(ctx) {
    const flag = window as unknown as { __tabhangarPopover?: boolean }
    if (flag.__tabhangarPopover) return
    flag.__tabhangarPopover = true

    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href ?? null
    const page = { url: location.href, title: document.title, favIconUrl: favicon }

    let mounted = false
    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'tabhangar-popover',
      css: contentCss,
      position: 'inline',
      anchor: 'html',
      onMount(container) {
        const root = createRoot(container)
        root.render(<PagePopover page={page} onClose={() => toggle(false)} />)
        return root
      },
      onRemove(root) {
        root?.unmount()
      },
    })

    function toggle(show = !mounted) {
      if (show && !mounted) {
        ui.mount()
        showInTopLayer(ui.shadowHost)
      }
      if (!show && mounted) ui.remove()
      mounted = show
    }
    toggle(true)

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isRuntimeMessage(message)) return undefined
      if (message.type === 'tabhangar:ping' && message.target === 'popover') {
        sendResponse('pong')
        return undefined
      }
      if (message.type === 'tabhangar:popover-toggle') toggle()
      return undefined
    })
  },
})
