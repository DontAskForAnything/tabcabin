/**
 * Uploads the built zip to the Chrome Web Store and sends it for review. The "Chrome Web Store"
 * workflow runs it; the item's first version is submitted by hand (docs/chrome-web-store).
 *
 * Needs CWS_SERVICE_ACCOUNT (the service account's JSON key), CWS_PUBLISHER_ID and
 * CWS_EXTENSION_ID. CWS_SUBMIT=false only uploads the draft.
 *
 * Run after `pnpm zip`: node --experimental-strip-types scripts/store/publish.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { accessToken, type ServiceAccount } from './token.ts'
import { webStore } from './webStore.ts'

const required = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not set (see docs/chrome-web-store/README.md)`)
  return value
}

const account = JSON.parse(required('CWS_SERVICE_ACCOUNT')) as ServiceAccount
const item = {
  publisherId: required('CWS_PUBLISHER_ID'),
  extensionId: required('CWS_EXTENSION_ID'),
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version: string
}
const zip = readFileSync(join(root, `.output/tabcabin-${version}-chrome.zip`))

const store = webStore(item, { token: await accessToken(account) })
await store.upload(zip)
console.warn(`Uploaded TabCabin ${version}`)
if (process.env.CWS_SUBMIT === 'false') {
  console.warn('Not sent for review: the draft waits in the Developer Dashboard')
} else {
  console.warn(`Sent for review (${await store.submit()})`)
}
