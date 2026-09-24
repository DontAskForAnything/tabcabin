import { z } from 'zod'
import type { users } from '../db/schema'

/* Validation and the shape of users as the API returns them. */

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9._-]+$/, 'use letters, digits, dot, dash or underscore')

export const passwordSchema = z.string().min(8).max(256)

export const emailSchema = z.email().trim().toLowerCase().max(254)

export interface PublicUser {
  id: string
  username: string
  email: string | null
  isAdmin: boolean
}

export const toPublic = (row: typeof users.$inferSelect): PublicUser => ({
  id: row.id,
  username: row.username,
  email: row.email,
  isAdmin: row.isAdmin,
})

export class UserError extends Error {
  constructor(
    readonly code: 'username_taken' | 'email_taken' | 'not_found' | 'invalid',
    message: string,
  ) {
    super(message)
  }
}
