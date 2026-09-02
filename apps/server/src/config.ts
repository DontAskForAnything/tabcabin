import { z } from 'zod'

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
  ADMIN_USERNAME: z.string().min(3).max(64).optional(),
  ADMIN_PASSWORD: z.string().min(8).max(256).optional(),
})

export interface Config {
  port: number
  host: string
  dataDir: string
  /** Address the server is reachable at (used for CORS and links). */
  publicUrl: string | null
  sessionTtlMs: number
  allowSignup: boolean
  /** First account, created on start when there are no users yet. */
  admin: { username: string; password: string } | null
}

/** Reads the configuration from environment variables; throws with every problem at once. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    throw new Error(`Invalid configuration:\n  ${problems.join('\n  ')}`)
  }
  const e = parsed.data
  if (!!e.ADMIN_USERNAME !== !!e.ADMIN_PASSWORD)
    throw new Error('Invalid configuration: set both ADMIN_USERNAME and ADMIN_PASSWORD, or neither')
  return {
    port: e.PORT,
    host: e.HOST,
    dataDir: e.DATA_DIR,
    publicUrl: e.PUBLIC_URL?.replace(/\/+$/, '') ?? null,
    sessionTtlMs: e.SESSION_TTL_DAYS * 86_400_000,
    allowSignup: e.ALLOW_SIGNUP,
    admin:
      e.ADMIN_USERNAME && e.ADMIN_PASSWORD
        ? { username: e.ADMIN_USERNAME, password: e.ADMIN_PASSWORD }
        : null,
  }
}
