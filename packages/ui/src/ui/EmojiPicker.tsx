import { Search } from 'lucide-react'
import { useUiText } from './UiText'
import { EmojiPicker as Picker } from 'frimousse'
import { type ReactElement, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

export interface EmojiPickerPanelProps {
  onSelect: (emoji: string) => void
  /** Base URL serving emojibase data (`<url>/<locale>/data.json`). Defaults to the CDN. */
  emojibaseUrl?: string
  locale?: 'en' | 'pl'
  searchPlaceholder?: string
  emptyLabel?: string
}

export function EmojiPickerPanel({
  onSelect,
  emojibaseUrl,
  locale,
  searchPlaceholder,
  emptyLabel,
}: EmojiPickerPanelProps) {
  const text = useUiText()
  return (
    <Picker.Root
      locale={locale ?? text.locale}
      emojibaseUrl={emojibaseUrl}
      columns={9}
      onEmojiSelect={(emoji) => onSelect(emoji.emoji)}
      className="flex h-[340px] w-[324px] flex-col"
    >
      <label className="mx-3 mt-3 mb-2 flex h-9 items-center gap-2 rounded-[10px] bg-subtle-2 px-2.5 text-ink-3">
        <Search size={15} />
        <Picker.Search
          placeholder={searchPlaceholder ?? text.searchEmoji}
          className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
        />
      </label>
      <Picker.Viewport className="relative flex-1 outline-none">
        <Picker.Loading className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-3">
          …
        </Picker.Loading>
        <Picker.Empty className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-3">
          {emptyLabel ?? text.noEmoji}
        </Picker.Empty>
        <Picker.List
          className="pb-2 select-none"
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                className="bg-card px-3.5 pt-2 pb-1 text-[11.5px] font-semibold tracking-[0.04em] text-ink-3 uppercase"
                {...props}
              >
                {category.label}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div className="scroll-my-1 px-2" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                type="button"
                className="flex size-[34px] items-center justify-center rounded-[9px] text-[22px] data-[active]:bg-subtle-2"
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </Picker.Viewport>
    </Picker.Root>
  )
}

export interface EmojiPickerPopoverProps extends EmojiPickerPanelProps {
  children: ReactElement
  align?: 'start' | 'center' | 'end'
}

/** Wraps a trigger element; opens the picker in a popover and closes after picking. */
export function EmojiPickerPopover({
  children,
  align = 'start',
  onSelect,
  ...panel
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="p-0">
        <EmojiPickerPanel
          {...panel}
          onSelect={(emoji) => {
            onSelect(emoji)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
