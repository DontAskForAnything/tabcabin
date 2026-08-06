import { expect, test } from './fixtures'

test('new tab page renders the app', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByText('TabHangar').first()).toBeVisible()
})

test('side panel page renders the app', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)
  await expect(page.getByText('TabHangar').first()).toBeVisible()
})
