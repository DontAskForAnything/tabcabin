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

const NAMES = Object.keys(COMMANDS)
  .map((command) => command.slice(1))
  .join('|')
// A command is a word of its own; the space after it goes with it, a line break stays.
const COMMAND = new RegExp(`(?<=^|\\s)\\/(${NAMES})(?:[ \\t]|(?=\\n)|$)`, 'g')
// A command that was just typed, right before the caret.
const TYPED = new RegExp(`(?<=^|\\s)\\/(${NAMES})([ \\t]?)$`)

/** "- " at line start becomes a bullet, "->" / "<-" become arrows. */
function typography(text: string): string {
  return text
    .replace(/(^|\n)- /g, '$1• ')
    .replace(/->/g, '→')
    .replace(/<-/g, '←')
}

/**
 * Applies the note shortcuts to text written in one go (a new note): bullets, arrows and a slash
 * command (/todo, /done, /note, /undone) anywhere in the text, which toggles flags.
 */
export function applyNoteShortcuts(input: string): NoteCommandResult {
  let flags: Omit<NoteCommandResult, 'text'> | undefined
  let text = input.replace(COMMAND, (_, name: string) => {
    flags = { ...flags, ...COMMANDS[`/${name}`] }
    return ''
  })
  if (flags) text = text.replace(/^[ \t]+/, '').replace(/[ \t]+(?=\n|$)/g, '')
  return flags ? { text: typography(text), ...flags } : { text: typography(text) }
}

/**
 * Applies the note shortcuts while typing. Only a command typed right before the caret counts,
 * wherever that is, so a note that mentions "/todo" keeps it. Returns where the caret goes.
 */
export function applyTypedNoteShortcuts(
  input: string,
  caret: number,
): NoteCommandResult & { caret: number } {
  const before = input.slice(0, caret)
  let after = input.slice(caret)
  const match = TYPED.exec(before)
  // "/todo" right before more letters is still being typed; a space or the end finishes it.
  if (!match || (!match[2] && after && !/^\s/.test(after)))
    return { text: typography(input), caret }
  let head = before.slice(0, match.index)
  if (/(^|\s)$/.test(head)) after = after.replace(/^[ \t]/, '')
  if (!after) head = head.replace(/[ \t]+$/, '')
  return { text: typography(head + after), caret: head.length, ...COMMANDS[`/${match[1]}`] }
}
