import { describe, expect, it } from 'vitest'
import { makeGroup, makeItem, makeLink, makeNote } from './factories'
import { combineItems, countItems, duplicateGroup, moveItems, sortItems, unstack } from './ops'
import { positionsAtEnd, sortByPosition } from './position'
import type { Item } from './schema'

const clock = { now: 1_000 }
const later = { now: 2_000 }

function links(groupId: string, count: number): Item[] {
  const keys = positionsAtEnd([], count)
  return keys.map((position, i) =>
    makeLink({ groupId, position, url: `https://site${i}.com`, title: `Site ${i}` }, clock),
  )
}

describe('moveItems', () => {
  it('moves an item to another group at an index', () => {
    const [a, b] = links('g1', 2)
    const target = links('g2', 2)
    const [moved] = moveItems({ moving: [a!], toGroupId: 'g2', siblings: target, index: 1 }, later)
    expect(moved!.groupId).toBe('g2')
    expect(moved!.updatedAt).toBe(2_000)
    const order = sortByPosition([...target, moved!]).map((item) => item.id)
    expect(order).toEqual([target[0]!.id, a!.id, target[1]!.id])
    expect(b!.groupId).toBe('g1')
  })

  it('reorders inside the same group ignoring the moving item', () => {
    const items = links('g1', 3)
    const [moved] = moveItems(
      { moving: [items[0]!], toGroupId: 'g1', siblings: items, index: 2 },
      later,
    )
    const order = sortByPosition([items[1]!, items[2]!, moved!]).map((item) => item.title)
    expect(order).toEqual(['Site 1', 'Site 2', 'Site 0'])
  })

  it('carries stack children to the new group', () => {
    const stack = makeItem({ kind: 'stack', groupId: 'g1', position: 'a0' }, clock)
    const child = makeLink({ groupId: 'g1', position: 'a0', url: 'https://x.com' }, clock)
    const rows = moveItems(
      {
        moving: [stack],
        children: [{ ...child, parentId: stack.id }],
        toGroupId: 'g2',
        siblings: [],
        index: 0,
      },
      later,
    )
    expect(rows.map((row) => row.groupId)).toEqual(['g2', 'g2'])
  })
})

describe('combineItems', () => {
  it('creates a stack from two links', () => {
    const [a, b] = links('g1', 2)
    const result = combineItems([a!], b!, { targetChildren: [], draggedChildren: [] }, later)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const stack = result.rows.find((row) => row.kind === 'stack')!
    expect(stack.position).toBe(b!.position)
    const children = result.rows.filter((row) => row.parentId === stack.id)
    expect(sortByPosition(children).map((c) => c.id)).toEqual([b!.id, a!.id])
  })

  it('appends to an existing stack and dissolves dragged stacks', () => {
    const [a, b, c] = links('g1', 3)
    const target = makeItem({ kind: 'stack', groupId: 'g1', position: 'b0' }, clock)
    const dragged = makeItem({ kind: 'stack', groupId: 'g1', position: 'c0' }, clock)
    const result = combineItems(
      [dragged],
      target,
      {
        targetChildren: [{ ...a!, parentId: target.id }],
        draggedChildren: [
          { ...b!, parentId: dragged.id },
          { ...c!, parentId: dragged.id },
        ],
      },
      later,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows.filter((row) => row.parentId === target.id)).toHaveLength(3)
    expect(result.rows.find((row) => row.id === dragged.id)?.deletedAt).toBe(2_000)
  })

  it('merges notes and rejects mixing notes with links', () => {
    const n1 = makeNote({ groupId: 'g1', position: 'a0', text: 'one' }, clock)
    const n2 = makeNote({ groupId: 'g1', position: 'a1', text: 'two' }, clock)
    const merged = combineItems([n2], n1, { targetChildren: [], draggedChildren: [] }, later)
    expect(merged.ok && merged.rows[0]!.text).toBe('one\ntwo')
    const [link] = links('g1', 1)
    expect(combineItems([link!], n1, { targetChildren: [], draggedChildren: [] }, later)).toEqual({
      ok: false,
      error: 'note-with-link',
    })
    expect(
      combineItems(
        [n1, link!],
        links('g1', 2)[1]!,
        { targetChildren: [], draggedChildren: [] },
        later,
      ),
    ).toEqual({ ok: false, error: 'stack-with-note' })
  })

  it('pins notes to a link after the ones it has, each keeping its own look', () => {
    const [link] = links('g1', 1)
    const note = (text: string, extra = {}) =>
      makeNote({ groupId: 'g2', position: 'a1', text, ...extra }, clock)
    const task = note('Task 1, due in December', { todo: true, color: 'amber' })
    const first = combineItems([task], link!, { targetChildren: [], draggedChildren: [] }, later)
    expect(first.ok && first.pinned).toBe(true)
    if (!first.ok) return
    expect(first.rows).toHaveLength(1)
    expect(first.rows[0]).toMatchObject({
      id: task.id,
      groupId: 'g1',
      parentId: link!.id,
      text: 'Task 1, due in December',
      todo: true,
      color: 'amber',
      deletedAt: null,
    })

    const plain = note('Slides')
    const second = combineItems(
      [plain],
      link!,
      { targetChildren: first.rows, draggedChildren: [] },
      later,
    )
    if (!second.ok) return
    expect(second.rows[0]!.position > first.rows[0]!.position).toBe(true)
  })
})

describe('unstack', () => {
  it('puts children where the stack was', () => {
    const [before, after] = links('g1', 2)
    const stack = makeItem({ kind: 'stack', groupId: 'g1', position: 'a0V' }, clock)
    const children = links('g1', 2).map((c) => ({ ...c, parentId: stack.id }))
    const rows = unstack(stack, children, [before!, stack, after!], later)
    const top = sortByPosition([before!, after!, ...rows.filter((r) => r.kind === 'link')])
    expect(top.map((r) => r.id)).toEqual([before!.id, children[0]!.id, children[1]!.id, after!.id])
    expect(rows.find((r) => r.id === stack.id)?.deletedAt).toBe(2_000)
  })
})

describe('duplicateGroup', () => {
  it('copies items with fresh ids and remapped stack parents', () => {
    const group = makeGroup({ categoryId: 'c1', position: 'a0', title: 'Tools' }, clock)
    const stack = makeItem({ kind: 'stack', groupId: group.id, position: 'a0' }, clock)
    const child = { ...links(group.id, 1)[0]!, parentId: stack.id }
    const copy = duplicateGroup(group, [stack, child], 'a1', later, ' (copy)')
    expect(copy.group.id).not.toBe(group.id)
    expect(copy.group.title).toBe('Tools (copy)')
    const newStack = copy.items.find((i) => i.kind === 'stack')!
    const newChild = copy.items.find((i) => i.kind === 'link')!
    expect(newChild.parentId).toBe(newStack.id)
    expect(newChild.groupId).toBe(copy.group.id)
  })
})

describe('sortItems & countItems', () => {
  it('sorts by title', () => {
    const items = [
      makeLink({ groupId: 'g', position: 'a0', url: 'https://b.com', title: 'beta' }, clock),
      makeLink({ groupId: 'g', position: 'a1', url: 'https://a.com', title: 'Alpha' }, clock),
    ]
    expect(sortByPosition(sortItems(items, 'title', later)).map((i) => i.title)).toEqual([
      'Alpha',
      'beta',
    ])
  })

  it('counts links, notes and tasks', () => {
    const items = [
      ...links('g', 2),
      makeNote({ groupId: 'g', position: 'b0', text: 'x' }, clock),
      makeNote({ groupId: 'g', position: 'b1', text: 'y', todo: true, done: true }, clock),
    ]
    expect(countItems(items)).toEqual({ links: 2, notes: 1, tasks: 1, done: 1 })
  })
})
