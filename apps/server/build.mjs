// Bundles the server and the admin CLI (with @tabhangar/core) into dist/; the native SQLite driver stays external.
import { build } from 'esbuild'
import { cpSync, rmSync } from 'node:fs'

rmSync('dist', { recursive: true, force: true })
await build({
  entryPoints: ['src/main.ts', 'src/cli.ts'],
  outdir: 'dist',
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
console.log('Built dist/main.js and dist/cli.js')
