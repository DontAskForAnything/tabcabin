import { describe, expect, it } from 'vitest'
import { makeGroup, makeItem } from '../factories'
import { entitySchemas } from '../schema'
import { TEMPLATES } from './catalog'
import { isTemplateId, localizeTemplate, templateById } from './localize'
import { TEMPLATE_IDS, type TemplateText } from './types'

const texts = (): TemplateText[] =>
  TEMPLATES.flatMap((template) => [
    template.name,
    template.summary,
    ...template.groups.flatMap((group) => [
      group.title,
      ...group.items.flatMap((item) =>
        'note' in item ? [item.note] : 'todo' in item ? [item.todo] : [],
      ),
    ]),
  ])

describe('templates', () => {
  it('lists every template once, in the order of the ids', () => {
    expect(TEMPLATES.map((template) => template.id)).toEqual([...TEMPLATE_IDS])
  })

  it('offers the four everyday ones in the welcome dialog', () => {
    expect(TEMPLATES.filter((t) => t.featured).map((t) => t.id)).toEqual([
      'work',
      'home',
      'study',
      'project',
    ])
  })

  it('is written in English and Polish, calmly and briefly', () => {
    for (const text of texts())
      for (const value of [text.en, text.pl]) {
        expect(value.trim()).toBe(value)
        expect(value.length).toBeGreaterThan(0)
        expect(value.length).toBeLessThanOrEqual(90)
        expect(value).not.toContain('!')
      }
  })

  it('gives every group something to start with', () => {
    for (const template of TEMPLATES) {
      expect(template.groups.length).toBeGreaterThanOrEqual(3)
      expect(template.groups.length).toBeLessThanOrEqual(4)
      for (const group of template.groups) expect(group.items.length).toBeGreaterThan(0)
    }
  })

  it('makes rows the sync schemas accept', () => {
    const clock = { now: Date.UTC(2026, 9, 16) }
    for (const template of TEMPLATES)
      for (const locale of ['en', 'pl'] as const)
        for (const group of localizeTemplate(template, locale).groups) {
          const row = makeGroup({ categoryId: 'c1', position: 'a0', ...group }, clock)
          expect(entitySchemas.group.safeParse(row).success).toBe(true)
          for (const item of group.items) {
            const stored = makeItem({ groupId: row.id, position: 'a0', ...item }, clock)
            expect(entitySchemas.item.safeParse(stored).success).toBe(true)
          }
        }
  })

  it('links only to https pages', () => {
    for (const template of TEMPLATES)
      for (const group of template.groups)
        for (const item of group.items)
          if ('link' in item) expect(new URL(item.link).protocol).toBe('https:')
  })

  it('localizes and looks templates up by id', () => {
    const thesis = localizeTemplate(templateById('thesis'), 'pl')
    expect(thesis.name).toBe('Praca dyplomowa')
    expect(thesis.groups[1]!.items[0]).toEqual({
      kind: 'note',
      text: 'Wstęp',
      todo: true,
      color: null,
    })
    expect(thesis.groups[0]!.items[0]).toEqual({
      kind: 'link',
      url: 'https://scholar.google.com/',
      title: 'Google Scholar',
    })
    expect(isTemplateId('job-hunt')).toBe(true)
    expect(isTemplateId('jobs')).toBe(false)
    expect(isTemplateId(42)).toBe(false)
  })
})
