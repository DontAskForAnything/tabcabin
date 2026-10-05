import { Button, Field } from '@tabcabin/ui'
import { useState } from 'react'
import { useT } from '@/i18n'
import { FormError } from './FormError'

/** Username and password, for signing in or (when the server allows it) creating an account. */
export function PasswordForm({
  signupOpen,
  busy,
  error,
  onSubmit,
  onModeChange,
}: {
  signupOpen: boolean
  busy: boolean
  error: string | null
  onSubmit: (username: string, password: string, create: boolean) => void
  onModeChange: () => void
}) {
  const t = useT()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (username && password) onSubmit(username, password, creating)
      }}
    >
      <Field
        label={t('sync.username')}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        spellCheck={false}
        autoFocus
      />
      <Field
        label={t('sync.password')}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete={creating ? 'new-password' : 'current-password'}
      />
      {error && <FormError>{error}</FormError>}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-1 w-full"
        disabled={busy || !username || !password}
      >
        {busy ? t('sync.signingIn') : creating ? t('sync.signUp') : t('sync.signIn')}
      </Button>
      {signupOpen && (
        <button
          type="button"
          className="w-fit text-[13px] font-medium text-accent-ink hover:underline"
          onClick={() => {
            setCreating((value) => !value)
            onModeChange()
          }}
        >
          {creating ? t('signin.haveAccount') : t('signin.noAccount')}
        </button>
      )}
    </form>
  )
}
