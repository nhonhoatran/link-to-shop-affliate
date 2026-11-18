import { build } from 'esbuild';
import { build as buildRenderer } from 'vite';
import { options } from './build-options.mjs';

await build(options('main', 'src/main/index.ts'));
await build(options('preload', 'src/preload/index.ts'));
await buildRenderer();
