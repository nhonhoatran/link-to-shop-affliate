import { createHash } from 'node:crypto';
import supertest from 'supertest';
import { DESKTOP_IMPORT_VERSION, serializeImportPayload, type ImportCommitContent } from '@under30ss/shared';
import { loggedInAgent, makePng, TEST_ORIGIN, type TestApp } from './test-app';

export const SOURCE_FINGERPRINT = 'a'.repeat(64);
export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const sessionPath = (id = 'session-1') => `/api/import/sessions/${id}`;

export const makeImporter = async (testApp: TestApp, email?: string) => {
  const admin = await loggedInAgent(testApp, email);
  const response = await admin.post('/api/admin/import-tokens').set('Origin', TEST_ORIGIN).send({
    label: 'Máy nhập thử', expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  if (response.status !== 201) throw new Error(`Token create failed: ${response.status} ${JSON.stringify(response.body)}`);
  return { admin, token: response.body.token as string, tokenId: response.body.record.id as string };
};

export const startSession = (testApp: TestApp, token: string, id = 'session-1') =>
  supertest(testApp.app).put(sessionPath(id)).auth(token, { type: 'bearer' }).send({
    contractVersion: DESKTOP_IMPORT_VERSION, sourceLabel: 'Ảnh mẫu', sourceFingerprint: SOURCE_FINGERPRINT,
  });

export const upload = async (testApp: TestApp, token: string, clientMediaId: string, kind = 'model', input?: Buffer, id = 'session-1') => {
  const buffer = input ?? await makePng(40, 60);
  return supertest(testApp.app).put(`${sessionPath(id)}/media/${clientMediaId}?kind=${kind}`)
    .auth(token, { type: 'bearer' }).set('X-Content-SHA256', sha256(buffer))
    .attach('file', buffer, { filename: 'image.png', contentType: 'image/png' });
};

export const content = (suffix = 'one'): ImportCommitContent => ({
  contractVersion: DESKTOP_IMPORT_VERSION,
  collection: { name: 'Bộ sưu tập thử', slug: `collection-${suffix}`, coverMediaId: 'model-image' },
  outfit: {
    slug: `outfit-${suffix}`, title: 'Trang phục thử', modelMediaId: 'model-image',
    items: [{ id: 'item-1', name: 'Áo', mediaId: 'item-image', side: 'left', order: 0, affiliateUrl: '', anchor: { x: 50, y: 35 } }],
  },
});

export const payload = (value = content()) => ({ ...value, payloadHash: sha256(serializeImportPayload(value)) });
export const commit = (testApp: TestApp, token: string, body = payload(), operationId = 'operation-1') =>
  supertest(testApp.app).put(`${sessionPath()}/operations/${operationId}`).auth(token, { type: 'bearer' }).send(body);

export const readySession = async (testApp: TestApp, token: string) => {
  if ((await startSession(testApp, token)).status !== 200) throw new Error('Session start failed');
  for (const [id, kind] of [['model-image', 'model'], ['item-image', 'item']] as const) {
    const response = await upload(testApp, token, id, kind);
    if (response.status !== 200) throw new Error(`Upload failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
};
