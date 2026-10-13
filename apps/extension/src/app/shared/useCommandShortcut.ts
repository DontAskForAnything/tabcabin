import { useEffect, useState } from 'react'

/** Browser shortcuts of the extension: open the save popover, save to the Inbox. */
export type Command = '_execute_action' | 'save-to-inbox'

/** The keys the user has for a browser shortcut of the extension ('' when none is set). */
export function useCommandShortcut(command: Command): string {
  const [keys, setKeys] = useState('')
  useEffect(() => {
    if (typeof browser === 'undefined' || !browser.commands) return
    void browser.commands
      .getAll()
      .then((commands) => setKeys(commands.find((c) => c.name === command)?.shortcut ?? ''))
  }, [command])
  return keys
}
