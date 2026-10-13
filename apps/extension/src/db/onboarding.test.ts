import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { finishOnboarding, getOnboarding, openOnboarding, removeStarter } from './onboarding'
import { addNote, clearAllData, createWorkspace } from './repo'
import { ensureSeed, type SeedText } from './seed'

const seedText: SeedText = {
  workspace: 'Personal',
  categories: ['Today', 'Read later', 'Projects'],
  quickLinks: 'Quick links',
  todo: 'To do',
  welcome: 'Welcome',
  readLater: 'Articles',
  tasks: ['a', 'b', 'c'],
  doneTask: 'done',
  welcomeNote: 'hi',
  tipNote: 'tip',
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('onboarding', () => {
  it('opens with the starter workspace on the first start only', async () => {
    const starterId = await ensureSeed(seedText)
    expect(await getOnboarding()).toMatchObject({ state: 'open', starterId })
    await finishOnboarding()
    await openOnboarding('another', Date.now())
    expect(await getOnboarding()).toEqual({ state: 'done' })
  })

  it('stays closed for data from before it existed', async () => {
    await createWorkspace({ name: 'Work', categoryName: 'Today' })
    expect(await ensureSeed(seedText)).toBeNull()
    expect(await getOnboarding()).toBeNull()
  })

  it('removes the untouched starter workspace for good', async () => {
    await ensureSeed(seedText)
    expect(await removeStarter()).toBe(true)
    for (const table of [db.workspaces, db.categories, db.groups, db.items])
      expect(await table.count()).toBe(0)
    const outbox = await db.outbox.toArray()
    expect(outbox.length).toBeGreaterThan(0)
    expect(outbox.every((entry) => entry.type === 'purge')).toBe(true)
    expect(await removeStarter()).toBe(false)
  })

  it('keeps the starter workspace once something in it changed', async () => {
    await ensureSeed(seedText)
    const group = (await db.groups.toArray())[0]!
    await tick()
    await addNote(group.id, { text: 'mine' })
    expect(await removeStarter()).toBe(false)
    expect(await db.workspaces.count()).toBe(1)
  })

  it('is not shown again after deleting all data', async () => {
    await ensureSeed(seedText)
    await finishOnboarding()
    await clearAllData()
    await ensureSeed(seedText)
    expect(await getOnboarding()).toEqual({ state: 'done' })
  })
})
