import { DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SettingsModel } from '../src/models/settings-model';
import { deleteAdmin } from '../src/services/admin-user-service';
import { TEST_ORIGIN, TEST_PASSWORD, loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;

beforeAll(async () => {
  testApp = await startTestApp({ IMAGE_MAX_EDGE_ITEM: '300', IMAGE_MAX_EDGE_MODEL: '500', WEBP_QUALITY: '80', UPLOAD_MAX_MB: '1' });
  agent = await loggedInAgent(testApp);
});

afterAll(async () => {
  await testApp.stop();
});

describe('settings', () => {
  it('serves env-driven defaults before anything is saved', async () => {
    const response = await agent.get('/api/admin/settings');
    expect(response.status).toBe(200);
    expect(response.body.siteName).toBeTruthy();
    const publicSettings = await supertest(testApp.app).get('/api/public/settings');
    expect(publicSettings.body).toMatchObject({ ogImageUrl: null });
  });

  it('saves settings, exposes the public view, and refreshes the cache', async () => {
    testApp.revalidateHits.length = 0;
    const og = { key: 'public/model/2026/11/og.webp', width: 1200, height: 630 };
    const response = await agent
      .put('/api/admin/settings')
      .set('Origin', TEST_ORIGIN)
      .send({ siteName: 'My Shop', seoTitle: 'My Shop - looks', seoDescription: 'Desc', ogImage: og, uploadMaxMb: 5 });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ siteName: 'My Shop', uploadMaxMb: 5 });
    expect(response.body.ogImage.url).toBe('http://cdn.test/media/public/model/2026/11/og.webp');
    expect(testApp.revalidateHits.at(-1)).toMatchObject({ scope: 'all', paths: [] });

    const publicSettings = await supertest(testApp.app).get('/api/public/settings');
    expect(publicSettings.body).toEqual({
      siteName: 'My Shop',
      seoTitle: 'My Shop - looks',
      seoDescription: 'Desc',
      ogImageUrl: 'http://cdn.test/media/public/model/2026/11/og.webp',
      looksPageSize: testApp.env.PUBLIC_LOOKS_PAGE_SIZE,
      relatedOutfitsCount: testApp.env.PUBLIC_RELATED_OUTFITS_COUNT,
      collectionsLabel: DEFAULT_COLLECTIONS_LABEL,
      collectionsNavVisible: false,
      footer: { columns: [], social: [] },
      announcement: null,
    });

    const cleared = await agent
      .put('/api/admin/settings')
      .set('Origin', TEST_ORIGIN)
      .send({ siteName: 'My Shop', seoTitle: 'My Shop - looks', seoDescription: 'Desc' });
    expect(cleared.body).not.toHaveProperty('ogImage');
    expect(cleared.body).not.toHaveProperty('uploadMaxMb');
  });

  it('rejects an upload limit above the env ceiling and accepts one at the ceiling', async () => {
    const base = { siteName: 'My Shop', seoTitle: 'My Shop', seoDescription: '' };
    const ceiling = testApp.env.UPLOAD_MAX_MB_CEILING;

    const tooHigh = await agent.put('/api/admin/settings').set('Origin', TEST_ORIGIN).send({ ...base, uploadMaxMb: ceiling + 1 });
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.body.error.fields).toHaveProperty('uploadMaxMb');

    const atCeiling = await agent.put('/api/admin/settings').set('Origin', TEST_ORIGIN).send({ ...base, uploadMaxMb: ceiling });
    expect(atCeiling.status).toBe(200);
    expect(atCeiling.body.uploadMaxMb).toBe(ceiling);
    await SettingsModel.deleteMany({});
  });

  it('validates settings input', async () => {
    const response = await agent.put('/api/admin/settings').set('Origin', TEST_ORIGIN).send({ siteName: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty('siteName');
  });
});

describe('admin users', () => {
  it('creates, lists and deletes admins but never exposes hashes', async () => {
    const created = await agent.post('/api/admin/admins').set('Origin', TEST_ORIGIN).send({ email: 'Second@Example.com', password: TEST_PASSWORD });
    expect(created.status).toBe(201);
    expect(created.body.email).toBe('second@example.com');
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');

    const duplicate = await agent.post('/api/admin/admins').set('Origin', TEST_ORIGIN).send({ email: 'second@example.com', password: TEST_PASSWORD });
    expect(duplicate.status).toBe(409);

    const weak = await agent.post('/api/admin/admins').set('Origin', TEST_ORIGIN).send({ email: 'weak@example.com', password: 'short' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.fields).toHaveProperty('password');

    const list = await agent.get('/api/admin/admins');
    expect(list.body.items).toHaveLength(2);

    const removed = await agent.delete(`/api/admin/admins/${created.body.id}`).set('Origin', TEST_ORIGIN);
    expect(removed.status).toBe(204);
    expect((await agent.get('/api/admin/admins')).body.items).toHaveLength(1);
  });

  it('answers 404 for a malformed admin id', async () => {
    const response = await agent.delete('/api/admin/admins/not-an-id').set('Origin', TEST_ORIGIN);
    expect(response.status).toBe(404);
  });

  it('refuses to delete the last remaining admin (service level)', async () => {
    const me = (await agent.get('/api/auth/me')).body;
    await expect(deleteAdmin('64b7f0c2a1b2c3d4e5f60718', 'someone-else')).rejects.toMatchObject({
      status: 409,
      message: 'Không thể xoá quản trị viên cuối cùng',
    });
    expect((await agent.get('/api/auth/me')).body.id).toBe(me.id);
  });

  it('refuses to delete the signed-in admin', async () => {
    const me = (await agent.get('/api/auth/me')).body;
    const response = await agent.delete(`/api/admin/admins/${me.id}`).set('Origin', TEST_ORIGIN);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });
});
