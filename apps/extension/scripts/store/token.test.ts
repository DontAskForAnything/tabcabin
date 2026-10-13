import { createVerify, generateKeyPairSync } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessToken, assertion } from './token.ts'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const account = {
  client_email: 'store@tabcabin.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
}
const NOW = Date.UTC(2026, 9, 14, 9, 0)

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())

describe('assertion', () => {
  it('asks for Chrome Web Store access for one hour, signed with the key', () => {
    const [header, claims, signature] = assertion(account, NOW).split('.') as [
      string,
      string,
      string,
    ]
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decode(claims)).toEqual({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/chromewebstore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: NOW / 1000,
      exp: NOW / 1000 + 3600,
    })
    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`)
    expect(verifier.verify(publicKey, signature, 'base64url')).toBe(true)
  })
})

describe('accessToken', () => {
  it('trades the signed JWT for a token', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ access_token: 'ya29.token' }))
    await expect(accessToken(account, fetcher, NOW)).resolves.toBe('ya29.token')
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe('https://oauth2.googleapis.com/token')
    const form = init!.body as URLSearchParams
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(form.get('assertion')).toBe(assertion(account, NOW))
  })

  it('says why Google refused', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' },
        { status: 400 },
      ),
    )
    await expect(accessToken(account, fetcher, NOW)).rejects.toThrow('Invalid JWT Signature.')
  })
})
