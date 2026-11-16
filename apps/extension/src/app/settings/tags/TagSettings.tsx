import { type Item, TAG_LIMITS } from '@tabcabin/core'
import { Button, Input, toast } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '@/db/db'
import { tagItemsByName } from '@/db/repo'
import { useT } from '@/i18n'
import { useTagList } from '../../tags/TagsContext'
import { TagRow } from './TagRow'

/** Settings → Tags: make, rename, recolour and remove the account's tags. */
export function TagSettings() {
  const t = useT()
  const { tags } = useTagList()
  const [name, setName] = useState('')
  const items = useLiveQuery(() => db.items.toArray(), [])
  const counts = useMemo(() => {
    const result = new Map<string, number>()
    for (const item of (items ?? []) as Item[])
      if (item.deletedAt === null)
        for (const id of item.tagIds ?? []) result.set(id, (result.get(id) ?? 0) + 1)
    return result
  }, [items])

  const add = async () => {
    if (!name.trim()) return
    const result = await tagItemsByName([], name)
    if (!result.ok && result.error === 'full')
      toast({ title: t('tags.full', { max: TAG_LIMITS.perAccount }), tone: 'error' })
    else setName('')
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <p className="text-[13px] leading-snug text-ink-3">
        {t('tags.settingsHint')}{' '}
        {t('tags.left', { count: tags.length, max: TAG_LIMITS.perAccount })}
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <Input
          className="flex-1"
          value={name}
          maxLength={TAG_LIMITS.nameLength + 2}
          placeholder={t('tags.placeholder')}
          aria-label={t('tags.placeholder')}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" variant="soft" disabled={!name.trim()}>
          {t('tags.addButton')}
        </Button>
      </form>
      {tags.length > 0 && (
        <ul className="flex flex-col">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} count={counts.get(tag.id) ?? 0} />
          ))}
        </ul>
      )}
    </div>
  )
}
