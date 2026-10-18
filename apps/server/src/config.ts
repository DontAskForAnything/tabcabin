import { z } from 'zod'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const list = (value: string | undefined) =>
  (value ?? '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

const flag = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((value) => value === 'true' || value === '1' || value === 'yes')

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('0.0.0.0'),
  DATA_DIR: z.string().default('./data'),
  PUBLIC_URL: z.url().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  ALLOW_SIGNUP: flag.default(false),
  TRUST_PROXY: flag.default(false),
  ADMIN_USERNAME: z.string().min(3).max(64).optional(),
  ADMIN_PASSWORD: z.string().min(8).max(256).optional(),
  MAX_USERS: z.coerce.number().int().min(0).default(0),
  SIGNUPS_PER_IP_PER_DAY: z.coerce.number().int().min(1).default(5),
  MAX_RECORDS_PER_USER: z.coerce.number().int().min(100).default(100_000),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  SIGNUP_EMAILS: z.string().optional(),
  EXTENSION_IDS: z.string().optional(),
  FEEDBACK_WEBHOOK_URL: z.url().optional(),
  FEEDBACK_PER_IP_PER_DAY: z.coerce.number().int().min(1).default(5),
  // Only for tests: a stand-in for Google's endpoints.
  GOOGLE_AUTH_URL: z.url().default('https://accounts.google.com/o/oauth2/v2/auth'),
  GOOGLE_TOKEN_URL: z.url().default(GOOGLE_TOKEN_URL),
})

export interface Config {
  port: number
  host: string
  dataDir: string
  /** Address the server is reachable at (used for CORS and links). */
  publicUrl: string | null
  sessionTtlMs: number
  allowSignup: boolean
  /** Take the client address from X-Forwarded-For (behind a reverse proxy such as Caddy). */
  trustProxy: boolean
  /** First account, created on start when there are no users yet. */
  admin: { username: string; password: string } | null
  /** "Sign in with Google", when a Google OAuth client is configured. */
  google: {
    clientId: string
    clientSecret: string
    authUrl: string
    tokenUrl: string
    /** Accepted `iss` values of ID tokens (empty when a test stand-in is used). */
    issuers: string[]
  } | null
  /**
   * Addresses that may create an account with Google even when signup is off: full addresses
   * (`ola@gmail.com`) or whole domains (`@example.com`).
   */
  signupEmails: string[]
  /** Extensions allowed to receive sign-ins (empty: any). */
  extensionIds: string[]
  /** Accounts the server accepts in total (0: no limit). */
  maxUsers: number
  /** New accounts (password or Google) one address may create per day. */
  signupsPerIpPerDay: number
  /** Synced rows (workspaces, groups, items…) one account may store. */
  maxRecordsPerUser: number
  /** Discord webhook that receives the feedback form (none: the form is off). */
  feedbackWebhook: string | null
  /** Feedback messages one address may send per day. */
  feedbackPerIpPerDay: number
}

/** Reads the configuration from environment variables; throws with every problem at once. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // Compose passes unset variables as empty strings; treat them as not set.
  const parsed = envSchema.safeParse(
    Object.fromEntries(Object.entries(env).filter(([, value]) => value !== '')),
  )
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    throw new Error(`Invalid configuration:\n  ${problems.join('\n  ')}`)
  }
  const e = parsed.data
  if (!!e.ADMIN_USERNAME !== !!e.ADMIN_PASSWORD)
    throw new Error('Invalid configuration: set both ADMIN_USERNAME and ADMIN_PASSWORD, or neither')
  if (!!e.GOOGLE_CLIENT_ID !== !!e.GOOGLE_CLIENT_SECRET)
    throw new Error(
      'Invalid configuration: set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither',
    )
  if (e.GOOGLE_CLIENT_ID && !e.PUBLIC_URL)
    throw new Error('Invalid configuration: Google sign-in needs PUBLIC_URL (for the callback)')
  return {
    port: e.PORT,
    host: e.HOST,
    dataDir: e.DATA_DIR,
    publicUrl: e.PUBLIC_URL?.replace(/\/+$/, '') ?? null,
    sessionTtlMs: e.SESSION_TTL_DAYS * 86_400_000,
    allowSignup: e.ALLOW_SIGNUP,
    trustProxy: e.TRUST_PROXY,
    admin:
      e.ADMIN_USERNAME && e.ADMIN_PASSWORD
        ? { username: e.ADMIN_USERNAME, password: e.ADMIN_PASSWORD }
        : null,
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? {
            clientId: e.GOOGLE_CLIENT_ID,
            clientSecret: e.GOOGLE_CLIENT_SECRET,
            authUrl: e.GOOGLE_AUTH_URL,
            tokenUrl: e.GOOGLE_TOKEN_URL,
            issuers:
              e.GOOGLE_TOKEN_URL === GOOGLE_TOKEN_URL
                ? ['https://accounts.google.com', 'accounts.google.com']
                : [],
          }
        : null,
    signupEmails: list(e.SIGNUP_EMAILS).map((entry) => entry.replace(/^\*@/, '@')),
    extensionIds: list(e.EXTENSION_IDS),
    maxUsers: e.MAX_USERS,
    signupsPerIpPerDay: e.SIGNUPS_PER_IP_PER_DAY,
    maxRecordsPerUser: e.MAX_RECORDS_PER_USER,
    feedbackWebhook: e.FEEDBACK_WEBHOOK_URL ?? null,
    feedbackPerIpPerDay: e.FEEDBACK_PER_IP_PER_DAY,
  }
}
