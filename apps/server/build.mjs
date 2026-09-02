// Bundles the server (and @tabhangar/core) into dist/main.js; the native SQLite driver stays external.
import { build } from 'esbuild'
import { cpSync, rmSync } from 'node:fs'

rmSync('dist', { recursive: true, force: true })
await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: ['better-sqlite3'],
  // Some dependencies are CommonJS and call require().
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
})
cpSync('drizzle', 'dist/drizzle', { recursive: true })
console.log('Built dist/main.js')
