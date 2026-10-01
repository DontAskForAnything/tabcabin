import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/teardown.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
})
