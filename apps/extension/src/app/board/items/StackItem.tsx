import { ChevronDown, Ellipsis, Layers, Split, Trash } from 'lucide-react'
import { displayHost } from '@tabcabin/core'
import {
  cn,
  Favicon,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@tabcabin/ui'
import { useState } from 'react'
import { useT } from '@/i18n'
import { faviconUrl, hostSeed } from '@/lib/browser'
import type { ItemViewProps } from '../ItemView'
import { ItemList } from '../ItemList'
import { LinkRow } from './LinkRow'
import { selectedRing, useSelectable } from './selection'

export function StackItem(props: ItemViewProps) {
  const { item, group, actions } = props
  const t = useT()
  const [open, setOpen] = useState(false)
  const { selected, onClickCapture } = useSelectable(item.id, group.id)
  const hosts = [...new Set(item.children.map((child) => displayHost(child.url)))].slice(0, 3)

  return (
    <div
      className={cn(
        'rounded-[13px] border border-dashed border-line bg-card transition-shadow',
        selected && selectedRing,
      )}
    >
      <div className="flex items-center gap-3 p-2.5" onClickCapture={onClickCapture}>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? t('stack.collapse') : t('stack.expand')}
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex shrink-0 pl-2">
            {item.children.slice(0, 4).map((child) => (
              <Favicon
                key={child.id}
                src={[faviconUrl(child.url), child.favIconUrl]}
                seed={hostSeed(child.url, child.title)}
                size="sm"
                className="-ml-2 ring-2 ring-card"
              />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">
              {item.title || t('stack.title', { count: item.children.length })}
            </span>
            <span className="block truncate text-[12px] text-ink-3">{hosts.join(' · ')}</span>
          </span>
          <ChevronDown
            size={16}
            className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
          />
        </button>
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={t('common.more')}
              icon={<Ellipsis size={15} />}
              size="sm"
              tooltip={false}
            />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon={<Layers size={15} />} onSelect={() => void actions.openStack(item)}>
              {t('stack.open')}
            </MenuItem>
            <MenuItem icon={<Split size={15} />} onSelect={() => void actions.unstack(item.id)}>
              {t('stack.unstack')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<Trash size={15} />}
              danger
              onSelect={() => void actions.deleteItems([item.id])}
            >
              {t('item.delete')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {open && (
        <ItemList
          groupId={group.id}
          parentId={item.id}
          parentKind="stack"
          items={item.children}
          className="min-h-[36px] gap-0.5 border-t border-dashed border-line px-1.5 py-1.5"
          renderItem={(child) => <LinkRow {...props} item={child} nested />}
        />
      )}
    </div>
  )
}
