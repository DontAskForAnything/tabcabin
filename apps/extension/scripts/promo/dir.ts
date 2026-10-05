import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Where footage and rendered frames go (outside the repo; they are large). */
export const PROMO_DIR = process.env.PROMO_DIR ?? join(tmpdir(), 'tabcabin-promo')
