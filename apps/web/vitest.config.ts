import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const sharedSrc = (p: string) => resolve(__dirname, '../../packages/shared/src', p);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@under30ss\/shared\/fixtures$/, replacement: sharedSrc('fixtures/index.ts') },
      { find: /^@under30ss\/shared$/, replacement: sharedSrc('index.ts') },
      { find: /^@\//, replacement: resolve(__dirname, 'src') + '/' },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
});
