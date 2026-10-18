import { createApp } from '@tabcabin/server/src/app'
import { loadConfig } from '@tabcabin/server/src/config'
import { openDatabase } from '@tabcabin/server/src/db/client'
import { migrationsFolder } from '@tabcabin/server/src/paths'
import { createUser } from '@tabcabin/server/src/users'
import { SyncClient } from './client'

export const SERVER = 'https://sync.test'

/** A sync server in memory for unit tests, with the account michal / "correct horse". */
export async function startServer() {
  const { db: serverDb } = openDatabase(':memory:', migrationsFolder())
  const app = createApp({ db: serverDb, config: loadConfig({}) })
  await createUser(serverDb, { username: 'michal', password: 'correct horse' })
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    app.request(String(input), init)) as typeof fetch
  const signIn = async () => {
    const client = new SyncClient(SERVER, null, fetchImpl)
    const { token, user } = await client.login('michal', 'correct horse', 'test')
    return { client, token, user }
  }
  return { fetchImpl, signIn }
}
