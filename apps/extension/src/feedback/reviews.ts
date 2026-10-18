/**
 * The Chrome Web Store page where people rate TabCabin, when this copy came from the store
 * (a copy built and loaded by hand has another id and no listing). The e2e build counts as one.
 */
export async function storeReviewsUrl(): Promise<string | null> {
  if (typeof browser === 'undefined' || !browser.runtime?.id) return null
  const self = await browser.management.getSelf().catch(() => null)
  const fromStore = self?.installType === 'normal' || import.meta.env.MODE === 'e2e'
  return fromStore ? `https://chromewebstore.google.com/detail/${browser.runtime.id}/reviews` : null
}
