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
    // Content specs change the shared home layout, settings and collections, so they must not overlap.
    // Playwright cannot serialize files inside one project, so each file is one step in a dependency chain.
    // visual and admin-shell run first: the visual snapshot of "/" needs the default layout.
    // Refuses to run against a non-local target and snapshots what content.teardown.ts restores.
    { name: 'content-setup', testMatch: /content\.setup\.ts/, dependencies: ['public', 'admin-shell', 'visual'] },
    {
      name: 'content-collections',
      testMatch: /content-collections-flow\.spec\.ts/,
      dependencies: ['content-setup'],
    },
    { name: 'content-home-editor-flow', testMatch: /content-home-editor-flow\.spec\.ts/, dependencies: ['content-collections'] },
    {
      name: 'content-home-editor-mobile',
      testMatch: /content-home-editor-mobile\.spec\.ts/,
      dependencies: ['content-home-editor-flow'],
    },
    {
      name: 'content-home-sections-render',
      testMatch: /content-home-sections-render\.spec\.ts/,
      dependencies: ['content-home-editor-mobile'],
    },
    {
      name: 'content-footer-and-nav',
      testMatch: /content-footer-and-nav\.spec\.ts/,
      dependencies: ['content-home-sections-render'],
      teardown: 'content-cleanup',
    },
    { name: 'content-cleanup', testMatch: /content\.teardown\.ts/ },
    { name: 'cleanup', testMatch: /cleanup\.teardown\.ts/ },
  ],
});
