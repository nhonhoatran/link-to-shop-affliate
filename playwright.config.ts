import { defineConfig, devices } from '@playwright/test';

// The stack is already running in Docker (Caddy on :8080); this config never starts a server.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    // Creates the outfit through the admin UI; teardown deletes it after the public project.
    { name: 'admin-flow', testMatch: /admin-outfit-flow\.spec\.ts/, teardown: 'cleanup' },
    { name: 'public', testMatch: /public-.*\.spec\.ts/, dependencies: ['admin-flow'] },
    // Not chained to public, so it runs even when a public spec fails. Both projects touch the shared settings document.
    { name: 'admin-shell', testMatch: /admin-shell-.*\.spec\.ts/ },
    { name: 'visual', testMatch: /visual-.*\.spec\.ts/ },
    { name: 'cleanup', testMatch: /cleanup\.teardown\.ts/ },
  ],
});
