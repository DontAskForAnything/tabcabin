import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from './fixtures'

let server: Server
let origin = ''

test.beforeAll(async () => {
  server = createServer((request, response) => {
    response.statusCode = request.url === '/gone' ? 404 : 200
    response.setHeader('content-type', 'text/html')
    response.end(request.method === 'HEAD' ? undefined : '<title>Page</title>')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test.afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

test('marks a saved link whose page is gone once link checks are on', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/newtab.html`)
  const todo = page.getByRole('region', { name: 'To do' })
  await todo.getByRole('button', { name: 'Note or link' }).click()
  await page.keyboard.type(`${origin}/fine`)
  await page.keyboard.press('Enter')
  await page.keyboard.type(`${origin}/gone`)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  const mark = 'This page did not load when it was last checked'
  await expect(todo.getByRole('link', { name: /\/gone/ })).toBeVisible()

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('switch', { name: 'Mark links that no longer load' }).click()
  await expect(settings).toContainText('1 link no longer loads.')
  await page.keyboard.press('Escape')

  await expect(
    todo.getByRole('link', { name: /\/gone/ }).getByRole('img', { name: mark }),
  ).toBeVisible()
  await expect(
    todo.getByRole('link', { name: /\/fine/ }).getByRole('img', { name: mark }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await settings.getByRole('switch', { name: 'Mark links that no longer load' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('img', { name: mark })).toHaveCount(0)
})
