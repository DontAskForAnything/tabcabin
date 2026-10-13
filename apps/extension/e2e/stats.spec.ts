import { expect, test } from './fixtures'

test('tells how many tabs TabCabin closed this week, quietly', async ({ context, extensionId }) => {
  for (const title of ['Alpha page', 'Beta page']) {
    const other = await context.newPage()
    await other.goto(`data:text/html,<title>${title}</title>`)
  }
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const panel = page.getByRole('navigation', { name: 'Open tabs' })
  await expect(panel.getByRole('button', { name: 'Alpha page' })).toBeVisible()
  await expect(panel.getByText(/this week/)).toHaveCount(0)

  await panel.getByRole('button', { name: 'Save all tabs' }).click()
  await page.getByRole('menuitem', { name: 'Save all into a new group' }).click()
  await panel.getByRole('button', { name: '2 tabs closed this week' }).click()

  const week = page.getByRole('dialog', { name: 'This week' })
  await expect(week.getByRole('definition')).toHaveText(['2', '2', '0'])
  await expect(week).toContainText('tabs closed')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('tab', { name: 'Appearance' }).click()
  await settings.getByRole('switch', { name: 'Show the week in the tabs panel' }).click()
  await page.keyboard.press('Escape')
  await expect(panel.getByText(/this week/)).toHaveCount(0)
})
