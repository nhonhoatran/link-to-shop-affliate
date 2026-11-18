import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = { '@under30ss/shared': resolve(__dirname, '../../packages/shared/src/index.ts') };
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      { extends: true, test: { name: 'main', environment: 'node', include: ['test/main/**/*.test.ts'] } },
      { extends: true, test: { name: 'ui', environment: 'jsdom', globals: true,
        include: ['test/ui/**/*.test.tsx'], setupFiles: ['./test/ui/setup.ts'] } },
    ],
  },
});
