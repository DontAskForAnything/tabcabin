import { createRoot } from 'react-dom/client'
import { isRuntimeMessage, type ToastMessage } from '@/messages'
import { InPageToasts, pushToast } from '@/content/InPageToasts'
import contentCss from '@/content/content.css?inline'
import { showInTopLayer } from '@/content/topLayer'

export default defineContentScript({
  // Injected on demand through `activeTab` (no host permissions, no web-accessible CSS).
  registration: 'runtime',
  cssInjectionMode: 'manual',
  async main(ctx) {
    const flag = window as unknown as { __tabcabinToast?: boolean }
    if (flag.__tabcabinToast) return
    flag.__tabcabinToast = true

    const ui = await createShadowRootUi(ctx, {
      name: 'tabcabin-toast',
      css: contentCss,
      position: 'inline',
      anchor: 'html',
      onMount(container) {
        const root = createRoot(container)
        root.render(<InPageToasts />)
        return root
      },
      onRemove(root) {
        root?.unmount()
      },
    })
    ui.mount()
    showInTopLayer(ui.shadowHost)

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isRuntimeMessage(message)) return undefined
      if (message.type === 'tabcabin:ping' && message.target === 'toast') {
        sendResponse('pong')
        return undefined
      }
      if (message.type === 'tabcabin:toast') pushToast(message as ToastMessage)
      return undefined
    })
  },
})
