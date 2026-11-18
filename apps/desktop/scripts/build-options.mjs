import { resolve } from 'node:path';

export const options = (name, entry) => ({
  entryPoints: [entry], outfile: `dist/${name}/index.cjs`, bundle: true, platform: 'node', format: 'cjs',
  target: 'node22', sourcemap: true, external: ['electron', ...(name === 'main' ? ['sharp'] : [])],
  alias: { '@under30ss/shared': resolve('../../packages/shared/src/index.ts') },
});
