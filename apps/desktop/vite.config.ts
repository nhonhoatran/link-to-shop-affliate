import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  root: __dirname,
  base: './',
  plugins: [react(), {
    name: 'dev-react-csp',
    transformIndexHtml: (html) => command === 'serve' ? html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") : html,
  }],
  resolve: { alias: { '@under30ss/shared': resolve(__dirname, '../../packages/shared/src/index.ts') } },
  build: { outDir: 'dist/renderer', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5178, strictPort: true },
}));
