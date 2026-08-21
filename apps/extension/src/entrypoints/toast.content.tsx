import { createRoot } from 'react-dom/client'
import { isRuntimeMessage, type ToastMessage } from '@/messages'
import { InPageToasts, pushToast } from '@/content/InPageToasts'
import contentCss from '@/content/content.css?inline'

export default defineContentScript({
  // Injected on demand through `activeTab` (no host permissions, no web-accessible CSS).
  registration: 'runtime',
  cssInjectionMode: 'manual',
  async main(ctx) {
    const flag = window as unknown as { __tabhangarToast?: boolean }
    if (flag.__tabhangarToast) return
    flag.__tabhangarToast = true

    const ui = await createShadowRootUi(ctx, {
      name: 'tabhangar-toast',
      css: contentCss,
      position: 'overlay',
      zIndex: 2147483646,
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

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isRuntimeMessage(message)) return undefined
      if (message.type === 'tabhangar:ping' && message.target === 'toast') {
        sendResponse('pong')
        return undefined
      }
      if (message.type === 'tabhangar:toast') pushToast(message as ToastMessage)
      return undefined
    })
  },
})
