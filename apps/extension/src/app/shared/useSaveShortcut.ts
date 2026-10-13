import { useEffect, useState } from 'react'

/** The keys of the browser shortcut that saves the current page ('' when none is set). */
export function useSaveShortcut(): string {
  const [keys, setKeys] = useState('')
  useEffect(() => {
    if (typeof browser === 'undefined' || !browser.commands) return
    void browser.commands
      .getAll()
      .then((commands) =>
        setKeys(commands.find((c) => c.name === '_execute_action')?.shortcut ?? ''),
      )
  }, [])
  return keys
}
