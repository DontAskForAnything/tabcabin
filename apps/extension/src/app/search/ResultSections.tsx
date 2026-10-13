import type { SearchDoc } from '@/db/search'
import { type Translate, useT } from '@/i18n'
import type { SearchHit } from './engine'
import { canMove } from './moveTo'
import { ResultRow } from './ResultRow'
import type { HitSection } from './sections'

function actionLabel(doc: SearchDoc, t: Translate): string {
  if (doc.kind === 'group') return t('search.actionOpenAll')
  if (doc.kind === 'command') return t('search.actionChooseGroup')
  if (doc.kind === 'tab') return t('search.actionSwitch')
  if (doc.kind === 'note' || doc.kind === 'todo') return t('search.actionGoTo')
  return t('search.actionOpen')
}

export function ResultSections({
  sections,
  selected,
  onHover,
  onOpen,
  onMove,
}: {
  sections: HitSection[]
  selected: SearchHit | undefined
  onHover: (hit: SearchHit) => void
  onOpen: (hit: SearchHit, reveal: boolean) => void
  onMove: (hit: SearchHit) => void
}) {
  const t = useT()
  return sections.map((section) => (
    <div key={section.key} className="mb-1">
      <div className="px-2.5 pt-2.5 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
        {t(section.key)}
      </div>
      {section.hits.map((hit) => (
        <ResultRow
          key={hit.doc.key}
          hit={hit}
          selected={hit === selected}
          onHover={() => onHover(hit)}
          onClick={(reveal) => onOpen(hit, reveal)}
          action={actionLabel(hit.doc, t)}
          onMove={canMove(hit.doc) ? () => onMove(hit) : undefined}
          moveLabel={t('search.actionMove')}
        />
      ))}
    </div>
  ))
}
