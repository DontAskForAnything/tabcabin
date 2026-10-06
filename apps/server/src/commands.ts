import type { Db } from './db/client'
import { createUser, deleteUser, listUsers, setEmail, setPassword, UserError } from './users'

const USAGE = `Usage: tabcabin <command>

  create-user <username> [--admin] [--email <address>]
                                     create an account (asks for the password)
  set-email <username> <address|->   let the Google account with this address sign in as
                                     <username> (- removes the address)
  reset-password <username>          set a new password and sign the user out everywhere
  delete-user <username>             delete an account and all of its data
  list-users                         list accounts with their address and sign-in methods
  backup <file>                      write a consistent copy of the database to <file>

The password is read from standard input when it is not a terminal, e.g.
  echo 'secret password' | tabcabin create-user michal`

export interface CommandIo {
  readPassword: (prompt: string) => Promise<string>
  print: (line: string) => void
  /** Copies the live database to a file (SQLite online backup). */
  backup?: (file: string) => Promise<void>
}

/** Runs one administration command; returns the process exit code. */
export async function runCommand(db: Db, args: string[], io: CommandIo): Promise<number> {
  const [command, username, ...flags] = args
  try {
    switch (command) {
      case 'create-user': {
        if (!username) break
        const at = flags.indexOf('--email')
        const email = at >= 0 ? flags[at + 1] : undefined
        if (at >= 0 && !email) break
        const password = await io.readPassword(`Password for ${username}: `)
        const user = await createUser(db, {
          username,
          password,
          email,
          isAdmin: flags.includes('--admin'),
        })
        io.print(`Created ${user.username}${user.isAdmin ? ' (admin)' : ''}`)
        return 0
      }
      case 'set-email': {
        const [address] = flags
        if (!username || !address) break
        setEmail(db, username, address === '-' ? null : address)
        io.print(
          address === '-'
            ? `Removed the address of ${username}`
            : `${username} can now sign in with Google as ${address.toLowerCase()}`,
        )
        return 0
      }
      case 'reset-password': {
        if (!username) break
        await setPassword(db, username, await io.readPassword(`New password for ${username}: `))
        io.print(`Password changed for ${username}; all sessions were signed out`)
        return 0
      }
      case 'delete-user': {
        if (!username) break
        deleteUser(db, username)
        io.print(`Deleted ${username}`)
        return 0
      }
      case 'backup': {
        if (!username || !io.backup) break
        await io.backup(username)
        io.print(`Backup written to ${username}`)
        return 0
      }
      case 'list-users': {
        const users = listUsers(db)
        if (users.length === 0) io.print('No users yet')
        for (const user of users) {
          const methods = [user.password && 'password', user.google && 'google'].filter(Boolean)
          io.print(
            [
              user.username,
              user.email ?? '-',
              methods.join('+') || 'no sign-in',
              user.isAdmin ? '(admin)' : '',
            ]
              .join('  ')
              .trim(),
          )
        }
        return 0
      }
    }
  } catch (error) {
    if (error instanceof UserError) {
      io.print(error.message)
      return 1
    }
    if (error instanceof Error && error.name === 'ZodError') {
      io.print(
        `Invalid input: ${(error as { issues?: { message: string }[] }).issues?.map((i) => i.message).join(', ')}`,
      )
      return 1
    }
    throw error
  }
  io.print(USAGE)
  return 2
}
