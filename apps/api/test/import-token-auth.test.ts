import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ImportTokenModel } from '../src/models/import-token-model';
import { AdminUserModel } from '../src/models/admin-user-model';
import { loggedInAgent, startTestApp, TEST_EMAIL, TEST_ORIGIN, type TestApp } from './helpers/test-app';
import { makeImporter, payload, sessionPath, startSession } from './helpers/import-fixtures';

let testApp: TestApp;
beforeEach(async () => { testApp = await startTestApp(); });
afterEach(async () => { await testApp.stop(); });

describe('desktop importer authentication', () => {
  it('creates a scoped token once and lists only metadata for its owner', async () => {
    const { admin, token, tokenId } = await makeImporter(testApp);
    const list = await admin.get('/api/admin/import-tokens?page=1&size=1').expect(200);
    expect(list.headers['cache-control']).toBe('no-store');
    expect(list.body).toMatchObject({ total: 1, page: 1, size: 1, items: [{ id: tokenId, scope: 'import:draft', revokedAt: null }] });
    expect(JSON.stringify(list.body)).not.toContain(token);
    expect(JSON.stringify(list.body)).not.toContain('tokenHash');
    const stored = await ImportTokenModel.findById(tokenId).select('+tokenHash').lean();
    expect(stored?.tokenHash).toHaveLength(64);
    expect(stored?.tokenHash).not.toBe(token);
    const capabilities = await supertest(testApp.app).get('/api/import/capabilities').auth(token, { type: 'bearer' }).expect(200);
    expect(capabilities.body).toMatchObject({ scope: 'import:draft', contractVersion: 'desktop-import.v1', sessionMaxMedia: 1000 });
    const other = await loggedInAgent(testApp, 'other@example.com');
    expect((await other.get('/api/admin/import-tokens')).body.items).toEqual([]);
    await other.delete(`/api/admin/import-tokens/${tokenId}`).set('Origin', TEST_ORIGIN).expect(404);
  });

  it('requires cookie admin authentication to manage tokens, and bearer auth to import', async () => {
    await supertest(testApp.app).post('/api/admin/import-tokens').send({}).expect(401);
    const { admin, token } = await makeImporter(testApp);
    await admin.get('/api/import/capabilities').expect(401);
    await supertest(testApp.app).get('/api/import/capabilities').auth('bad-token', { type: 'bearer' }).expect(401);
    for (const path of ['/api/admin/settings', '/api/admin/admins', '/api/admin/outfits', '/api/admin/import-tokens']) {
      await supertest(testApp.app).get(path).auth(token, { type: 'bearer' }).expect(401);
    }
  });

  it('rejects revoked, expired tokens and tokens owned by deleted admins immediately', async () => {
    const { admin, token, tokenId } = await makeImporter(testApp);
    await admin.delete(`/api/admin/import-tokens/${tokenId}`).set('Origin', TEST_ORIGIN).expect(204);
    await admin.delete(`/api/admin/import-tokens/${tokenId}`).set('Origin', TEST_ORIGIN).expect(204);
    await supertest(testApp.app).get('/api/import/capabilities').auth(token, { type: 'bearer' }).expect(401);
    const response = await admin.post('/api/admin/import-tokens').set('Origin', TEST_ORIGIN).send({
      label: 'Token hết hạn', expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }).expect(201);
    await ImportTokenModel.updateOne({ _id: response.body.record.id }, { $set: { expiresAt: new Date(0) } });
    await supertest(testApp.app).get('/api/import/capabilities').auth(response.body.token as string, { type: 'bearer' }).expect(401);
    await ImportTokenModel.updateOne({ _id: response.body.record.id }, { $set: { expiresAt: new Date(Date.now() + 86_400_000) } });
    await AdminUserModel.deleteOne({ email: TEST_EMAIL });
    await supertest(testApp.app).get('/api/import/capabilities').auth(response.body.token as string, { type: 'bearer' }).expect(401);
  });

  it('isolates sessions even between two tokens belonging to the same admin', async () => {
    const { admin, token } = await makeImporter(testApp);
    await startSession(testApp, token).expect(200);
    const second = await admin.post('/api/admin/import-tokens').set('Origin', TEST_ORIGIN).send({
      label: 'Máy khác', expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }).expect(201);
    await supertest(testApp.app).get(sessionPath()).auth(second.body.token as string, { type: 'bearer' }).expect(404);
    await supertest(testApp.app).put(`${sessionPath()}/operations/op`).auth(second.body.token as string, { type: 'bearer' }).send(payload()).expect(404);
    await startSession(testApp, second.body.token as string).expect(200);
    await admin.delete(`/api/admin/import-tokens/${second.body.record.id}`).set('Origin', TEST_ORIGIN).expect(204);
    await supertest(testApp.app).get(sessionPath()).auth(second.body.token as string, { type: 'bearer' }).expect(401);
    await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
  });

  it('validates token labels and expiry dates and keeps the admin CSRF policy intact', async () => {
    const { admin, token } = await makeImporter(testApp);
    for (const expiresAt of [new Date(0).toISOString(), new Date(Date.now() + 400 * 86_400_000).toISOString(), 'not-a-date']) {
      await admin.post('/api/admin/import-tokens').set('Origin', TEST_ORIGIN).send({ label: 'Máy thử', expiresAt }).expect(400);
    }
    await admin.post('/api/admin/import-tokens').set('Origin', TEST_ORIGIN).send({ label: '', expiresAt: new Date().toISOString() }).expect(400);
    await startSession(testApp, token).set('Origin', 'https://untrusted.example').expect(403);
    await startSession(testApp, token).expect(200);
    await supertest(testApp.app).put(`${sessionPath()}/operations/operation-1`).auth(token, { type: 'bearer' })
      .field('arbitrary', 'multipart is not allowed here').expect(415);
  });
});
