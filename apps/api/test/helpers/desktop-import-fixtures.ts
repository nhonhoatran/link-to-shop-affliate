import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DesktopDraft } from '@under30ss/shared';
import { DesktopRuntime } from '../../../desktop/src/main/desktop-runtime';
import { makePng, type TestApp } from './test-app';

export const manualDesktopDraft = (name: string, itemCount = 1): DesktopDraft => ({
  title: `Trang phục ${name}`, slug: `desktop-${name}`, seoDescription: 'Bản nháp nhập thủ công trong kiểm thử',
  collection: { name: `Bộ ${name}`, slug: `desktop-${name}`, description: 'Dữ liệu kiểm thử, không phải kết quả AI' },
  modelCrop: { x: 25, y: 0, width: 50, height: 100 }, reviewReasons: [],
  items: Array.from({ length: itemCount }, (_, index) => ({
    id: `item-${index}`, name: `Món ${index}`, subtitle: '', description: '', side: index === 0 ? 'left' : 'right', order: 0,
    crop: { x: index === 0 ? 0 : 80, y: 10, width: 20, height: 20 },
    sourceAnchor: { x: 50, y: 40 + index * 10 }, affiliateUrl: '', reviewReasons: [],
  })),
});

export const prepareDesktopHttp = async (app: TestApp, scratchParent?: string) => {
  const server = createServer(app.app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  if (scratchParent) await mkdir(scratchParent, { recursive: true });
  const root = await mkdtemp(path.join(scratchParent ?? tmpdir(), 'under30ss-desktop-http-'));
  const source = path.join(root, 'source');
  const data = path.join(root, 'local-data');
  await mkdir(source);
  await writeFile(path.join(source, 'one.png'), await makePng(100, 140));
  await writeFile(path.join(source, 'two.png'), await makePng(120, 160));
  // Test-only reversible encryption; Electron smoke covers the operating-system credential API.
  const encryption = {
    available: () => true,
    encrypt: (value: string) => Buffer.from(Buffer.from(value).map((byte) => byte ^ 0x5a)),
    decrypt: (value: Buffer) => Buffer.from(value.map((byte) => byte ^ 0x5a)).toString('utf8'),
  };
  const reopen = () => new DesktopRuntime(data, {
    chooseFolder: async () => source, openExternal: async () => undefined, emit: () => undefined, encryption,
  });
  return { server, origin, root, data, source, reopen, runtime: reopen() };
};

export const closeHttpServer = async (server: Server) => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
};
