import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../src/db/client'
import { databaseFile } from '../src/db/file'
import { migrationsFolder } from '../src/paths'
import { createUser, listUsers } from '../src/users'

const dataDir = () => mkdtempSync(join(tmpdir(), 'tabcabin-data-'))

describe('database file', () => {
  it('uses tabcabin.db in the data folder', () => {
    const dir = dataDir()
    expect(databaseFile(dir)).toBe(join(dir, 'tabcabin.db'))
  })

  it('moves a database from before the rename, with its write-ahead log', () => {
    const dir = dataDir()
    writeFileSync(join(dir, 'tabhangar.db'), 'main')
    writeFileSync(join(dir, 'tabhangar.db-wal'), 'wal')

    databaseFile(dir)

    expect(readFileSync(join(dir, 'tabcabin.db'), 'utf8')).toBe('main')
    expect(readFileSync(join(dir, 'tabcabin.db-wal'), 'utf8')).toBe('wal')
    expect(existsSync(join(dir, 'tabhangar.db'))).toBe(false)
  })

  it('never overwrites an existing tabcabin.db', () => {
    const dir = dataDir()
    writeFileSync(join(dir, 'tabcabin.db'), 'new')
    writeFileSync(join(dir, 'tabhangar.db'), 'old')

    databaseFile(dir)

    expect(readFileSync(join(dir, 'tabcabin.db'), 'utf8')).toBe('new')
    expect(existsSync(join(dir, 'tabhangar.db'))).toBe(true)
  })

  it('keeps the accounts of an old server', async () => {
    const dir = dataDir()
    const old = openDatabase(join(dir, 'tabhangar.db'), migrationsFolder())
    await createUser(old.db, { username: 'michal', password: 'correct horse' })
    old.sqlite.close()

    const moved = openDatabase(databaseFile(dir), migrationsFolder())
    expect((await listUsers(moved.db)).map((user) => user.username)).toEqual(['michal'])
    moved.sqlite.close()
  })
})
