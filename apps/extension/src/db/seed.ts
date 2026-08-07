import {
  makeCategory,
  makeGroup,
  makeLink,
  makeNote,
  makeWorkspace,
  positionsAtEnd,
  put,
  puts,
} from '@tabhangar/core'
import { applyChanges } from './apply'
import { db } from './db'

export interface SeedText {
  workspace: string
  categories: [string, string, string]
  quickLinks: string
  todo: string
  welcome: string
  readLater: string
  tasks: [string, string, string]
  doneTask: string
  welcomeNote: string
  tipNote: string
}

/** Creates a small starter workspace on the very first run. Returns the workspace id if created. */
export async function ensureSeed(text: SeedText): Promise<string | null> {
  const seeded = await db.meta.get('seeded')
  if (seeded || (await db.workspaces.count()) > 0) return null
  const clock = { now: Date.now() }
  const workspace = makeWorkspace({ name: text.workspace, emoji: '🛩️', position: 'a0' }, clock)
  const [p0, p1, p2] = positionsAtEnd([], 3)
  const categories = text.categories.map((name, i) =>
    makeCategory({ workspaceId: workspace.id, name, position: [p0, p1, p2][i]! }, clock),
  )
  const today = categories[0]!
  const [g0, g1, g2] = positionsAtEnd([], 3)
  const quick = makeGroup(
    { categoryId: today.id, position: g0!, title: text.quickLinks, emoji: '🌍' },
    clock,
  )
  const todo = makeGroup(
    { categoryId: today.id, position: g1!, title: text.todo, emoji: '📥' },
    clock,
  )
  const welcome = makeGroup(
    { categoryId: today.id, position: g2!, title: text.welcome, emoji: '👋' },
    clock,
  )
  const readLater = makeGroup(
    { categoryId: categories[1]!.id, position: g0!, title: text.readLater, emoji: '📚' },
    clock,
  )

  const linkKeys = positionsAtEnd([], 4)
  const links = [
    ['https://github.com', 'GitHub'],
    ['https://mail.google.com', 'Gmail'],
    ['https://calendar.google.com', 'Google Calendar'],
    ['https://www.youtube.com', 'YouTube'],
  ].map(([url, title], i) =>
    makeLink({ groupId: quick.id, position: linkKeys[i]!, url: url!, title }, clock),
  )

  const taskKeys = positionsAtEnd([], 5)
  const tasks = [
    makeNote(
      { groupId: todo.id, position: taskKeys[0]!, text: text.doneTask, todo: true, done: true },
      clock,
    ),
    ...text.tasks.map((task, i) =>
      makeNote({ groupId: todo.id, position: taskKeys[i + 1]!, text: task, todo: true }, clock),
    ),
    makeNote(
      { groupId: todo.id, position: taskKeys[4]!, text: text.tipNote, color: 'lilac' },
      clock,
    ),
  ]
  const welcomeNote = makeNote(
    { groupId: welcome.id, position: 'a0', text: text.welcomeNote, color: 'amber' },
    clock,
  )

  await applyChanges([
    put('workspace', workspace),
    ...puts('category', categories),
    ...puts('group', [quick, todo, welcome, readLater]),
    ...puts('item', [...links, ...tasks, welcomeNote]),
  ])
  await db.meta.put({ key: 'seeded', value: clock.now })
  return workspace.id
}
