import { useState } from 'react'
import { useT } from '@/i18n'
import { ApiError, type SignedIn, SyncClient } from '@/sync/client'
import { requestIdentityPermission, signInWithGoogle } from '@/sync/google'
import { deviceLabel } from '@/sync/session'
import { errorText } from './errorText'

export type SignInMethod = 'google' | 'password'

/** Runs a sign-in against the sync server and keeps its progress and error for the form. */
export function useSignIn(
  server: string,
  onSignedIn: (client: SyncClient, result: SignedIn, via: SignInMethod) => Promise<void>,
) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ text: string; from: SignInMethod } | null>(null)

  const run = async (from: SignInMethod, signIn: (client: SyncClient) => Promise<SignedIn>) => {
    setBusy(true)
    setError(null)
    try {
      const client = new SyncClient(server)
      await onSignedIn(client, await signIn(client), from)
    } catch (err) {
      // Closing the Google window is not an error worth showing.
      if (!(err instanceof ApiError && err.code === 'cancelled'))
        setError({ text: errorText(err, t), from })
    } finally {
      setBusy(false)
    }
  }

  return {
    busy,
    error,
    clearError: () => setError(null),
    withGoogle() {
      // Ask before anything else: the prompt needs the click's user gesture.
      const granted = requestIdentityPermission()
      void run('google', async (client) => {
        if (!(await granted)) throw new ApiError(0, 'permission')
        return signInWithGoogle(client, deviceLabel())
      })
    },
    withPassword(username: string, password: string, create: boolean) {
      void run('password', (client) => client.login(username, password, deviceLabel(), create))
    },
  }
}
