import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Chromium may still write a few files after a profile is deleted; clean up once at the end. */
export default function teardown() {
  rmSync(join(tmpdir(), 'tabhangar-e2e'), { recursive: true, force: true })
}
