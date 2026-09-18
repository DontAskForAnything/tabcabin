import { extensionUrl } from './browser'

/** Opens the sign-in page: in this tab on the new tab page, in a new tab elsewhere. */
export function openSignInPage(sameTab: boolean) {
  const url = extensionUrl('/signin.html')
  if (sameTab) location.assign(url)
  else void browser.tabs.create({ url })
}

export function openBoards() {
  location.assign(extensionUrl('/newtab.html'))
}
