import { z } from 'zod'
import type { Config } from '../../config'

type Google = NonNullable<Config['google']>

export interface GoogleClaims {
  sub: string
  email: string
  emailVerified: boolean
}

const tokenResponse = z.object({ id_token: z.string() })
const claimsSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  sub: z.string().min(1),
  email: z.string().optional(),
  email_verified: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional(),
})

/** Claims of an ID token received directly from Google over TLS (OIDC Core 3.1.3.7). */
function readIdToken(idToken: string, google: Google, nowMs: number): GoogleClaims | null {
  const payload = idToken.split('.')[1]
  if (!payload) return null
  let claims: z.infer<typeof claimsSchema>
  try {
    claims = claimsSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
  } catch {
    return null
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audiences.includes(google.clientId)) return null
  if (google.issuers.length > 0 && !google.issuers.includes(claims.iss)) return null
  if (claims.exp * 1000 < nowMs) return null
  return {
    sub: claims.sub,
    email: claims.email ?? '',
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
  }
}

/** Trades Google's authorization code for the signed-in account (null when anything is off). */
export async function exchangeCode(
  fetcher: typeof fetch,
  google: Google,
  request: { code: string; verifier: string; redirectUri: string },
  nowMs: number,
): Promise<GoogleClaims | null> {
  try {
    const response = await fetcher(google.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: request.code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: request.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: request.verifier,
      }),
    })
    const body = tokenResponse.safeParse(await response.json().catch(() => null))
    return response.ok && body.success ? readIdToken(body.data.id_token, google, nowMs) : null
  } catch (error) {
    console.error('Google token request failed:', error)
    return null
  }
}
