import { defineConfig } from '@playwright/test'

/** Generates the README screenshots into docs/screenshots (run `pnpm screenshots`). */
export default defineConfig({
  testDir: './scripts',
  testMatch: '*.shots.ts',
  workers: 1,
  reporter: 'list',
})
