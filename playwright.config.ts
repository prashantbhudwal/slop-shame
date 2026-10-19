import { defineConfig } from '@playwright/test';

const port = Number(process.env.SLOP_FIXTURE_PORT ?? 4179);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1, // The opt-in real project shares one persistent login profile.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { headless: process.env.SLOP_HEADED !== '1', trace: 'retain-on-failure' },
  webServer: {
    command: 'node --experimental-strip-types tests/e2e/server.ts',
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  projects: [
    { name: 'fixture-feed', testMatch: 'fixture-feed.spec.ts' },
    { name: 'real-linkedin', testMatch: 'real-linkedin.spec.ts', use: { headless: false } },
  ],
});
