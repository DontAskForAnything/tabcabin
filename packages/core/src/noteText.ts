export interface NoteCommandResult {
  text: string
  todo?: boolean
  done?: boolean
}

const COMMANDS: Record<string, Omit<NoteCommandResult, 'text'>> = {
  '/todo': { todo: true },
  '/note': { todo: false, done: false },
  '/done': { todo: true, done: true },
  '/undone': { done: false },
}

/**
 * Applies inline shortcuts while typing in a note:
 * "- " at line start becomes a bullet, "->" / "<-" become arrows and
 * a trailing slash command (/todo, /done, /note, /undone) toggles flags.
 */
export function applyNoteShortcuts(input: string): NoteCommandResult {
  let text = input
    .replace(/(^|\n)- /g, '$1• ')
    .replace(/->/g, '→')
    .replace(/<-/g, '←')

  for (const [command, flags] of Object.entries(COMMANDS)) {
    const match = new RegExp(`(^|\\s)${command.replace('/', '\\/')}\\s?$`).exec(text)
    if (match) {
      text = text.slice(0, match.index + (match[1]?.length ?? 0)).trimEnd()
      return { text, ...flags }
    }
  }
  return { text }
}
