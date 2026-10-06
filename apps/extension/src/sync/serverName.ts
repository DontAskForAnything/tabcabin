/** Names a sync server reports in /health; servers from before the rename say "tabhangar". */
const NAMES: readonly unknown[] = ['tabcabin', 'tabhangar']

export const isSyncServer = (name: unknown) => NAMES.includes(name)
