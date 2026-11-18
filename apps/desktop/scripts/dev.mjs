import { spawn } from 'node:child_process';
import electron from 'electron';
import { context } from 'esbuild';
import { createServer } from 'vite';
import { options } from './build-options.mjs';

const server = await createServer();
await server.listen();
const builds = await Promise.all([
  context(options('main', 'src/main/index.ts')),
  context(options('preload', 'src/preload/index.ts')),
]);
await Promise.all(builds.map((build) => build.rebuild()));
await Promise.all(builds.map((build) => build.watch()));
const env = { ...process.env, DESKTOP_RENDERER_URL: server.resolvedUrls.local[0] };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ['.'], { stdio: 'inherit', env });
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  child.kill();
  await Promise.all(builds.map((build) => build.dispose()));
  await server.close();
};
child.once('exit', () => { void close(); });
process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
