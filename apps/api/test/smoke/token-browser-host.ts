import { spawn } from 'node:child_process';
import { createServer, request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { parseEnv } from '../../src/config/env-config';
import { createApp } from '../../src/create-app';
import { connectMongo, disconnectMongo } from '../../src/db/mongo-connection';
import { createAdmin } from '../../src/services/admin-user-service';

const listen = async (server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
};
const close = async (server: Server) => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
};

export const startTokenBrowserHost = async (repoRoot: string) => {
  const mongo = await MongoMemoryServer.create();
  let apiPort = 0;
  let nextPort = 0;
  const proxy = createServer((incoming, outgoing) => {
    const upstream = httpRequest({ hostname: '127.0.0.1', port: incoming.url?.startsWith('/api/') ? apiPort : nextPort,
      method: incoming.method, path: incoming.url, headers: incoming.headers }, (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.pipe(upstream);
  });
  const origin = `http://127.0.0.1:${await listen(proxy)}`;
  const env = parseEnv({ NODE_ENV: 'test', MONGODB_URI: mongo.getUri('desktop-token-browser'),
    SESSION_SECRET: 'isolated-browser-session-secret-at-least-32', S3_ENDPOINT: 'http://127.0.0.1:9', S3_BUCKET: 'test',
    S3_ACCESS_KEY: 'test', S3_SECRET_KEY: 'test', MEDIA_PUBLIC_BASE_URL: `${origin}/media`,
    WEB_REVALIDATE_URL: `${origin}/api/revalidate`, REVALIDATE_SECRET: 'isolated-test-revalidate-secret', ALLOWED_ORIGIN: origin });
  await connectMongo(env.MONGODB_URI);
  await createAdmin('import-smoke@example.test', 'test-only-smoke-password-26');
  const api = createServer(createApp({ env, storage: { putObject: async () => undefined }, revalidate: async () => undefined }));
  apiPort = await listen(api);
  const reservation = createServer();
  nextPort = await listen(reservation);
  await close(reservation);
  const child = spawn(process.execPath, [path.join(repoRoot, 'apps/web/node_modules/next/dist/bin/next'), 'start',
    '--hostname', '127.0.0.1', '--port', String(nextPort)], {
    cwd: path.join(repoRoot, 'apps/web'), windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', API_INTERNAL_URL: `http://127.0.0.1:${apiPort}`, SITE_URL: origin,
      MEDIA_PUBLIC_BASE_URL: `${origin}/media`, REVALIDATE_SECRET: env.REVALIDATE_SECRET, NEXT_TELEMETRY_DISABLED: '1' },
  });
  let logs = '';
  const collect = (value: Buffer) => { logs = (logs + value.toString()).slice(-6000); };
  child.stdout.on('data', collect); child.stderr.on('data', collect);
  child.on('error', (error) => { logs += error.message; });
  return {
    origin, apiOrigin: `http://127.0.0.1:${apiPort}`, logs: () => logs,
    async ready() {
      const deadline = Date.now() + 75_000;
      while (Date.now() < deadline) {
        try { if ((await fetch(`${origin}/admin/login`, { signal: AbortSignal.timeout(2000) })).ok) return; } catch { /* Wait for Next startup. */ }
        if (child.exitCode !== null) throw new Error(`Next exited ${child.exitCode}: ${logs}`);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Next did not become ready: ${logs}`);
    },
    async stop() {
      if (child.exitCode === null && child.pid) {
        if (process.platform === 'win32') {
          const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/taskkill.exe'), ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, shell: false, stdio: 'ignore' });
          await new Promise<void>((resolve) => { killer.once('close', () => resolve()); killer.once('error', () => { child.kill(); resolve(); }); });
        } else child.kill('SIGTERM');
      }
      await close(proxy); await close(api); await disconnectMongo(); await mongo.stop();
    },
  };
};
