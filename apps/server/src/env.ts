import type { PublicUser } from './users'

/** Hono context variables set by the auth middleware. */
export interface AppEnv {
  Variables: {
    user: PublicUser
    tokenHash: string
  }
}
