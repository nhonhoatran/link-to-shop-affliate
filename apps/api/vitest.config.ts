import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const sharedSrc = (p: string) => resolve(__dirname, '../../packages/shared/src', p);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@under30ss\/shared\/fixtures$/, replacement: sharedSrc('fixtures/index.ts') },
      { find: /^@under30ss\/shared$/, replacement: sharedSrc('index.ts') },
    ],
  },
  test: {
    environment: 'node',
    globalSetup: ['test/setup/shared-mongod-global-setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
