import { mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { runCommand } from './commands'
import { loadConfig } from './config'
import { openDatabase } from './db/client'
import { databaseFile } from './db/file'
import { migrationsFolder } from './paths'

/** Reads a password without echoing it, or the first line of piped input. */
function readPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    const lines = createInterface({ input: process.stdin })
    return new Promise((resolve) => {
      let done = false
      lines.once('line', (line) => {
        done = true
        lines.close()
        resolve(line)
      })
      lines.once('close', () => !done && resolve(''))
    })
  }
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    const input = process.stdin
    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')
    let value = ''
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          input.setRawMode(false)
          input.pause()
          input.off('data', onData)
          process.stdout.write('\n')
          resolve(value)
          return
        }
        if (char === '\u0003') process.exit(130)
        if (char === '\u007f') value = value.slice(0, -1)
        else value += char
      }
    }
    input.on('data', onData)
  })
}

const config = loadConfig()
mkdirSync(config.dataDir, { recursive: true })
const { db, sqlite } = openDatabase(databaseFile(config.dataDir), migrationsFolder())
const code = await runCommand(db, process.argv.slice(2), {
  readPassword,
  print: (line) => console.log(line),
  backup: async (file) => {
    await sqlite.backup(file)
  },
})
sqlite.close()
process.exit(code)
