import { type ReactNode, useState } from 'react'
import { useSyncServer } from '@/sync/server'
import { completeSignIn, type PendingChoice } from '@/sync/session'
import { useAccount } from '@/sync/state'
import { FirstSyncChoice } from './FirstSyncChoice'
import { NoServer } from './NoServer'
import { Showcase } from './showcase/Showcase'
import { SignedInNote } from './SignedInNote'
import { SignInForm } from './SignInForm'

/** The sign-in page (signin.html): a picture of the boards on the left, the current step on the right. */
export function SignInPage() {
  const server = useSyncServer()
  const account = useAccount()
  const [choice, setChoice] = useState<PendingChoice | null>(null)
  const [done, setDone] = useState(false)
  if (server === undefined || account === undefined) return null

  let step: ReactNode
  if (!server) step = <NoServer />
  else if (choice)
    step = (
      <FirstSyncChoice
        choice={choice}
        onDone={() => {
          setChoice(null)
          setDone(true)
        }}
      />
    )
  else if (done || (account?.token && account.initialized))
    step = <SignedInNote username={account?.user.username ?? ''} />
  else
    step = (
      <SignInForm
        server={server}
        expired={!!account && !account.token}
        onSignedIn={async (client, result, via) => {
          const pending = await completeSignIn(client, result, account, via)
          if (pending) setChoice(pending)
          else setDone(true)
        }}
      />
    )

  return (
    <div className="grid min-h-screen bg-panel text-ink lg:grid-cols-[minmax(0,1.07fr)_minmax(0,1fr)]">
      <Showcase />
      <main className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[380px]">{step}</div>
      </main>
    </div>
  )
}
