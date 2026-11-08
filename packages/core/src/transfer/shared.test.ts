import { describe, expect, it } from 'vitest'
import { copySharedGroup, sharedGroupSchema } from './shared'

const clock = { now: Date.UTC(2026, 10, 8) }
const row = (fields: Record<string, unknown>) => ({
  title: '',
  url: null,
  favIconUrl: null,
  text: '',
  color: null,
  todo: false,
  done: false,
  parentId: null,
  ...fields,
})

describe('copying a shared group', () => {
  it('keeps the order, stacks, pinned notes and to-dos with new ids', () => {
    const shared = sharedGroupSchema.parse({
      title: 'Weekend in Lisbon',
      emoji: '✈️',
      sharedAt: 1,
      updatedAt: 2,
      items: [
        row({
          id: 'l1',
          kind: 'link',
          url: 'https://tram.example/28',
          title: 'Tram 28',
          favIconUrl: 'https://tram.example/i.png',
        }),
        row({ id: 'p1', kind: 'note', text: 'Leaves at 8', color: 'amber', parentId: 'l1' }),
        row({ id: 's1', kind: 'stack', title: 'Things to see' }),
        row({
          id: 's1a',
          kind: 'link',
          url: 'https://belem.example/',
          title: 'Belém',
          parentId: 's1',
        }),
        row({ id: 't1', kind: 'note', text: 'Book the transfer', todo: true, done: true }),
        row({ id: 'n1', kind: 'note', text: 'Go early', color: 'not-a-colour', done: true }),
      ],
    })
    const { group, items } = copySharedGroup(shared, { categoryId: 'cat', position: 'a0' }, clock)
    expect(group).toMatchObject({
      categoryId: 'cat',
      position: 'a0',
      title: 'Weekend in Lisbon',
      emoji: '✈️',
    })
    expect(items.map((item) => [item.kind, item.title || item.text])).toEqual([
      ['link', 'Tram 28'],
      ['note', 'Leaves at 8'],
      ['stack', 'Things to see'],
      ['link', 'Belém'],
      ['note', 'Book the transfer'],
      ['note', 'Go early'],
    ])
    const [link, pinned, stack, inStack, todo, note] = items
    expect(items.every((item) => item.groupId === group.id)).toBe(true)
    expect(new Set(items.map((item) => item.id)).size).toBe(6)
    expect(items.map((item) => item.id)).not.toContain('l1')
    expect(pinned!.parentId).toBe(link!.id)
    expect(inStack!.parentId).toBe(stack!.id)
    expect(link!.favIconUrl).toBe('https://tram.example/i.png')
    expect([todo!.todo, todo!.done]).toEqual([true, true])
    // A plain note is never "done", and an unknown colour is no colour.
    expect([note!.done, note!.color]).toEqual([false, null])
    expect(link!.position < stack!.position && stack!.position < todo!.position).toBe(true)
  })

  it('drops what a browser can’t open, empty stacks and loops', () => {
    const shared = sharedGroupSchema.parse({
      title: 'Odd',
      emoji: '',
      items: [
        row({ id: 'bad', kind: 'link', url: 'javascript:alert(1)', title: 'Bad' }),
        row({ id: 'gone', kind: 'stack', title: 'Nothing left' }),
        row({ id: 'gone-a', kind: 'link', url: 'data:text/html,hi', parentId: 'gone' }),
        row({ id: 'a', kind: 'stack', parentId: 'b' }),
        row({ id: 'b', kind: 'stack', parentId: 'a' }),
        row({
          id: 'ok',
          kind: 'link',
          url: 'https://ok.example/',
          favIconUrl: 'http://ok.example/i.png',
        }),
      ],
    })
    const { group, items } = copySharedGroup(shared, { categoryId: 'cat', position: 'a0' }, clock)
    expect(group.emoji).toBe('🔗')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      url: 'https://ok.example/',
      title: 'https://ok.example/',
      favIconUrl: null,
    })
  })
})
