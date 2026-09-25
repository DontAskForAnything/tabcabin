import { useT } from '@/i18n'
import type { ActiveContext } from '../useActive'
import { ChromeGroupBlock } from './ChromeGroupBlock'
import type { TabBlock } from './tabBlocks'
import { TabRow } from './tab/TabRow'
import type { OpenTab } from './useOpenTabs'

export function TabList({
  blocks,
  allTabs,
  active,
}: {
  blocks: TabBlock[]
  /** Every tab of the window: dragging a selected tab takes all selected ones along. */
  allTabs: OpenTab[]
  active: ActiveContext
}) {
  const t = useT()
  return (
    <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
      {blocks.map((block) =>
        block.type === 'tab' ? (
          <TabRow key={block.tab.id} tab={block.tab} allTabs={allTabs} active={active} />
        ) : (
          <ChromeGroupBlock
            key={`g${block.group.id}`}
            group={block.group}
            tabs={block.tabs}
            allTabs={allTabs}
            active={active}
          />
        ),
      )}
      {blocks.length === 0 && (
        <p className="px-2 py-6 text-center text-[13px] text-ink-3">{t('panel.noTabs')}</p>
      )}
    </div>
  )
}
