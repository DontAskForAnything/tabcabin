import type { Db } from './db/client'
import { createUser, deleteUser, listUsers, setPassword, UserError } from './users'

export const USAGE = `Usage: tabhangar <command>

  create-user <username> [--admin]   create an account (asks for the password)
  reset-password <username>          set a new password and sign the user out everywhere
  delete-user <username>             delete an account and all of its data
  list-users                         list accounts

The password is read from standard input when it is not a terminal, e.g.
  echo 'secret password' | tabhangar create-user michal`

export interface CommandIo {
  readPassword: (prompt: string) => Promise<string>
  print: (line: string) => void
}

/** Runs one administration command; returns the process exit code. */
export async function runCommand(db: Db, args: string[], io: CommandIo): Promise<number> {
  const [command, username, ...flags] = args
  try {
    switch (command) {
      case 'create-user': {
        if (!username) break
        const password = await io.readPassword(`Password for ${username}: `)
        const user = await createUser(db, {
          username,
          password,
          isAdmin: flags.includes('--admin'),
        })
        io.print(`Created ${user.username}${user.isAdmin ? ' (admin)' : ''}`)
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
      case 'list-users': {
        const users = listUsers(db)
        if (users.length === 0) io.print('No users yet')
        for (const user of users) io.print(`${user.username}${user.isAdmin ? '  (admin)' : ''}`)
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
