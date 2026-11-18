import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { DEFAULT_DESKTOP_SETTINGS, desktopDraftSchema, posterAnalysisSchema, POSTER_ANALYSIS_VERSION } from '@under30ss/shared';
import { SessionStore } from '../../src/main/session-store';
import type { CredentialEncryption } from '../../src/main/settings-store';

const directories: string[] = [];
export const temporaryDirectory = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'u30-desktop-test-'));
  directories.push(directory);
  return directory;
};
export const cleanupDirectories = async () => {
  for (const directory of directories.splice(0)) {
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('u30-desktop-test-')) {
      throw new Error('Unsafe test cleanup path');
    }
    await rm(directory, { recursive: true, force: true });
  }
};
export const testEncryption = (): CredentialEncryption => {
  const key = randomBytes(32);
  return {
    available: () => true,
    encrypt: (value) => {
      const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
      const content = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), content]);
    },
    decrypt: (value) => {
      const cipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12));
      cipher.setAuthTag(value.subarray(12, 28));
      return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString('utf8');
    },
  };
};
export const settingsFixture = () => structuredClone(DEFAULT_DESKTOP_SETTINGS);
export const posterFixture = () => posterAnalysisSchema.parse({ version: POSTER_ANALYSIS_VERSION,
  status: 'needs_review', title: 'Trang phục thử', description: null,
  modelCrop: { x: 25, y: 10, width: 50, height: 80 }, reviewReasons: ['Giữ đường chỉ dẫn trên ảnh'],
  items: [{ id: 'shirt', name: 'Áo', subtitle: null, description: null, side: 'left', order: 0,
    crop: { x: 0, y: 0, width: 20, height: 20 }, sourceAnchor: { x: 50, y: 50 }, reviewReasons: [] }],
});
export const draftFixture = () => desktopDraftSchema.parse({ title: 'Trang phục thử', slug: 'trang-phuc-thu', seoDescription: '',
  collection: { name: 'Bộ sưu tập thử', slug: 'bo-suu-tap-thu', description: '' }, modelCrop: posterFixture().modelCrop,
  reviewReasons: [], items: posterFixture().items.map((item) => ({ ...item, name: item.name || '', subtitle: '', description: '', affiliateUrl: '' })),
});
export const imageFixture = (width = 100, height = 200) =>
  sharp({ create: { width, height, channels: 3, background: 'white' } }).png().toBuffer();

export const sessionFixture = async (count = 1) => {
  const directory = await temporaryDirectory();
  const folder = path.join(directory, 'input'); await mkdir(folder);
  const source = path.join(folder, 'poster.png'); await writeFile(source, await imageFixture());
  for (let index = 1; index < count; index++) await writeFile(path.join(folder, `poster-${index + 1}.png`), await imageFixture());
  const settings = settingsFixture();
  const store = new SessionStore(path.join(directory, 'state'));
  const session = await store.create(folder, 'Phiên thử', settings);
  const file = (await store.get(session.id)).files[0]!;
  return { directory, folder, source, store, session, file, settings };
};
