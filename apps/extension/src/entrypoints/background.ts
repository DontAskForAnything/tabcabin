export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void browser.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false })
  })
})
