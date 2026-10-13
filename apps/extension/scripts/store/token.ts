import { createSign } from 'node:crypto'

/** The fields of a Google Cloud service account key (the downloaded JSON file) used here. */
export interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri?: string
}

const SCOPE = 'https://www.googleapis.com/auth/chromewebstore'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** A signed JWT that asks Google for one hour of Chrome Web Store access. */
export function assertion(account: ServiceAccount, now: number): string {
  const issuedAt = Math.floor(now / 1000)
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: account.client_email,
    scope: SCOPE,
    aud: account.token_uri ?? GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url')
  return `${unsigned}.${signature}`
}

/** Trades the service account's signed JWT for an access token. */
export async function accessToken(
  account: ServiceAccount,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<string> {
  const response = await fetcher(account.token_uri ?? GOOGLE_TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion(account, now),
    }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!response.ok || !body.access_token)
    throw new Error(
      `Google did not accept the service account: ${body.error_description ?? body.error ?? response.status}`,
    )
  return body.access_token
}
