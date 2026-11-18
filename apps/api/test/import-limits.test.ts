import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { ImportTokenModel } from '../src/models/import-token-model';
import { ImportSessionModel } from '../src/models/import-session-model';
import { OutfitModel } from '../src/models/outfit-model';
import { startTestApp, TEST_ORIGIN, type TestApp } from './helpers/test-app';
import { commit, content, makeImporter, payload, readySession, startSession, upload } from './helpers/import-fixtures';

let testApp: TestApp | undefined;
afterEach(async () => { if (testApp) await testApp.stop(); testApp = undefined; });

describe('desktop import configurable limits', () => {
  it('reserves token slots atomically and releases them on revoke', async () => {
    testApp = await startTestApp({ IMPORT_ACTIVE_TOKENS_PER_ADMIN: '2' });
    const { admin, tokenId } = await makeImporter(testApp);
    const create = () => admin.post('/api/admin/import-tokens').set('Origin', TEST_ORIGIN).send({
      label: 'Thiết bị khác', expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const concurrent = await Promise.all([create(), create(), create()]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([201, 409, 409]);
    expect(await ImportTokenModel.countDocuments({ revokedAt: { $exists: false } })).toBe(2);
    await admin.delete(`/api/admin/import-tokens/${tokenId}`).set('Origin', TEST_ORIGIN).expect(204);
    await create().expect(201);
  });

  it('enforces session limits under concurrent creates and still permits an existing session retry', async () => {
    testApp = await startTestApp({ IMPORT_SESSIONS_PER_TOKEN: '1' });
    const { token } = await makeImporter(testApp);
    const concurrent = await Promise.all([startSession(testApp, token, 'one'), startSession(testApp, token, 'two')]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await ImportSessionModel.countDocuments()).toBe(1);
    const created = concurrent.find((response) => response.status === 200)!;
    await startSession(testApp, token, created.body.clientSessionId as string).expect(200);
  });

  it('enforces per-session media and operation quotas without affecting retries', async () => {
    testApp = await startTestApp({ IMPORT_SESSION_MAX_MEDIA: '2', IMPORT_SESSION_MAX_OPERATIONS: '1' });
    const { token } = await makeImporter(testApp);
    await readySession(testApp, token);
    expect((await upload(testApp, token, 'third-image')).status).toBe(409);
    expect((await upload(testApp, token, 'model-image')).status).toBe(200);
    await commit(testApp, token).expect(200);
    await commit(testApp, token).expect(200);
    await commit(testApp, token, payload(content('two')), 'operation-2').expect(409);
    expect(await OutfitModel.countDocuments()).toBe(1);
  });

  it('rate limits the import surface separately from admin cookie routes', async () => {
    testApp = await startTestApp({ IMPORT_RATE_LIMIT_MAX: '2' });
    const { token, admin } = await makeImporter(testApp);
    const capabilities = () => supertest(testApp!.app).get('/api/import/capabilities').auth(token, { type: 'bearer' });
    await capabilities().expect(200);
    await capabilities().expect(200);
    const blocked = await capabilities().expect(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    await admin.get('/api/admin/import-tokens').expect(200);
  });
});
