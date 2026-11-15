import { TAG_LIMITS } from '@tabcabin/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  addLinks,
  createGroup,
  createWorkspace,
  deleteTag,
  getTags,
  revert,
  setItemsTag,
  tagItemsByName,
  updateTag,
} from './repo'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

async function links(count: number) {
  const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
  const groupId = (await createGroup(ws.categoryId, { title: 'One', emoji: '🌍' })).groupId
  const urls = Array.from({ length: count }, (_, i) => ({ url: `https://${i}.example` }))
  return (await addLinks(groupId, urls)).ids
}

const tagsOf = async (id: string) => (await db.items.get(id))!.tagIds ?? []

describe('tags', () => {
  it('makes a tag by name once and puts it on items, with undo', async () => {
    const [a, b] = await links(2)
    const first = await tagItemsByName([a!, b!], '#Work')
    expect(first.ok).toBe(true)
    const again = await tagItemsByName([a!], 'work')
    expect(again.ok && again.tag.id).toBe(first.ok && first.tag.id)
    expect(await getTags()).toHaveLength(1)
    expect(await tagsOf(a!)).toHaveLength(1)

    if (first.ok) await revert(first)
    expect(await getTags()).toHaveLength(0)
    expect(await tagsOf(b!)).toEqual([])
  })

  it('takes a tag off and leaves items that are full', async () => {
    const [a, b] = await links(2)
    const names = Array.from({ length: TAG_LIMITS.perItem }, (_, i) => `t${i}`)
    for (const name of names) await tagItemsByName([a!], name)
    const extra = await tagItemsByName([a!, b!], 'extra')
    expect(extra.ok && extra.full).toBe(1)
    expect(await tagsOf(a!)).toHaveLength(TAG_LIMITS.perItem)
    expect(await tagsOf(b!)).toHaveLength(1)

    const t0 = (await getTags()).find((tag) => tag.name === 't0')!
    await setItemsTag([a!], t0.id, false)
    expect(await tagsOf(a!)).toHaveLength(TAG_LIMITS.perItem - 1)
  })

  it('renames, recolours and removes a tag; a name can only be used once', async () => {
    const [a] = await links(1)
    const work = await tagItemsByName([a!], 'work')
    await tagItemsByName([a!], 'uni')
    if (!work.ok) throw new Error('no tag')
    expect(await updateTag(work.tag.id, { name: 'UNI' })).toEqual({ ok: false, error: 'taken' })
    await updateTag(work.tag.id, { name: 'Job', color: 'lime' })
    expect((await getTags())[0]).toMatchObject({ name: 'Job', color: 'lime' })

    const removed = await deleteTag(work.tag.id)
    expect((await getTags()).map((tag) => tag.name)).toEqual(['uni'])
    await revert(removed)
    expect((await getTags()).map((tag) => tag.name)).toEqual(['Job', 'uni'])
    expect(await tagsOf(a!)).toHaveLength(2)
  })
})
