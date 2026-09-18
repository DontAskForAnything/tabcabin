import type { Translate } from '@/i18n'
import { ApiError } from '@/sync/client'

/** A sentence for a failed sign-in or sync request. */
export function errorText(error: unknown, t: Translate): string {
  if (!(error instanceof ApiError)) return t('sync.error.generic', { code: String(error) })
  switch (error.code) {
    case 'invalid_credentials':
    case 'signup_disabled':
    case 'username_taken':
    case 'invalid_request':
    case 'network':
    case 'not_invited':
    case 'email_not_verified':
    case 'google_failed':
    case 'invalid_code':
    case 'permission':
    case 'too_many_signups':
    case 'server_full':
      return t(`sync.error.${error.code}`)
    case 'too_many_attempts':
      return t('sync.error.too_many_attempts', { seconds: error.retryAfter ?? 60 })
    default:
      return t('sync.error.generic', { code: error.code })
  }
}
