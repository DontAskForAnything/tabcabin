import AxeBuilder from '@axe-core/playwright'
import { type Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** Serious and critical accessibility problems on the current page. */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
    }))
}

test('board, dialogs and collections have no serious accessibility problems', async ({
  context,
  extensionId,
}) => {
  // Many audits in a row: give the slower machines some room.
  test.setTimeout(60_000)
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  const report: Record<string, Awaited<ReturnType<typeof audit>>> = {}

  report.board = await audit(page)

  const dialogs: [string, () => Promise<unknown>, string][] = [
    ['search', () => page.keyboard.press('Control+k'), 'Search'],
    ['reminders', () => page.getByRole('button', { name: 'Reminders' }).click(), 'Reminders'],
    ['shortcuts', () => page.keyboard.press('?'), 'Keyboard shortcuts'],
    ['bin', () => page.keyboard.press('Control+Shift+Backspace'), 'Bin'],
    ['workspaces', () => page.keyboard.press('Control+o'), 'Workspaces'],
    [
      'week',
      async () => {
        await page.getByRole('button', { name: 'More' }).click()
        await page.getByRole('menuitem', { name: 'This week' }).click()
      },
      'This week',
    ],
    [
      'newWorkspace',
      async () => {
        await page.getByRole('button', { name: 'Switch workspace' }).click()
        await page.getByRole('menuitem', { name: 'New workspace' }).click()
      },
      'New workspace',
    ],
  ]
  for (const [name, open] of dialogs) {
    await open()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.waitForTimeout(300)
    report[name] = await audit(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  for (const tab of ['General', 'Appearance', 'Shortcuts', 'Data']) {
    await page.getByRole('tab', { name: tab }).click()
    report[`settings-${tab}`] = await audit(page)
  }
  await page.keyboard.press('Escape')

  await page.getByRole('radio', { name: 'Collections' }).click()
  await page.waitForTimeout(300)
  report.collections = await audit(page)

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(400)
  report.collectionsDark = await audit(page)
  await page.getByRole('radio', { name: 'Board' }).click()
  await page.waitForTimeout(400)
  report.boardDark = await audit(page)

  const failures = Object.fromEntries(Object.entries(report).filter(([, v]) => v.length > 0))
  expect(failures).toEqual({})
})

test('shows the shortcuts with ? and item actions on keyboard focus', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  await expect(page.getByRole('heading', { name: 'Quick links' })).toBeVisible()
  await page.keyboard.press('?')
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(sheet.getByRole('region', { name: 'Board and notes' })).toContainText('Enter')
  await sheet.getByRole('button', { name: 'Customize shortcuts' }).click()
  await expect(page.getByRole('tab', { name: 'Shortcuts' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.keyboard.press('Escape')

  const group = page.getByRole('region', { name: 'Quick links' })
  await group.getByRole('link', { name: /GitHub/ }).focus()
  await expect(group.getByRole('button', { name: 'Reminder' }).first()).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(group.getByRole('button', { name: 'Reminder' }).first()).toBeFocused()
})

test.describe('first start', () => {
  test.use({ welcome: true })

  test('the welcome dialog has no serious accessibility problems', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/newtab.html`)
    const report: Record<string, Awaited<ReturnType<typeof audit>>> = {}
    const both = async (step: string) => {
      await page.waitForTimeout(400)
      for (const dark of [false, true]) {
        await page.evaluate((on) => document.documentElement.classList.toggle('dark', on), dark)
        await page.waitForTimeout(200)
        report[`${step}${dark ? 'Dark' : ''}`] = await audit(page)
      }
    }

    await expect(page.getByRole('dialog', { name: 'Welcome to TabCabin' })).toBeVisible()
    await both('welcome')
    await page.getByRole('button', { name: 'Get started' }).click()
    await expect(page.getByRole('dialog', { name: 'How would you like to start?' })).toBeVisible()
    await both('start')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('dialog', { name: 'Good to know' })).toBeVisible()
    await both('tips')

    const failures = Object.fromEntries(Object.entries(report).filter(([, v]) => v.length > 0))
    expect(failures).toEqual({})
  })
})
