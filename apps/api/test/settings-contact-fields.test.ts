import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SettingsModel } from '../src/models/settings-model';
import { adminApi } from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let api: ReturnType<typeof adminApi>;
const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };
const publicSettings = async () => (await supertest(testApp.app).get('/api/public/settings')).body;
const save = (body: object) => api.put('/api/admin/settings', { ...base, ...body });

beforeAll(async () => {
  testApp = await startTestApp();
  api = adminApi(await loggedInAgent(testApp));
});
afterAll(async () => { await testApp.stop(); });
beforeEach(async () => { await SettingsModel.deleteMany({}); });

describe('contact settings', () => {
  it('has no invented contact details by default', async () => {
    expect(await publicSettings()).not.toHaveProperty('contactEmail');
    expect(await publicSettings()).not.toHaveProperty('contactPhone');
  });

  it('saves contacts, returns them on reload and refreshes public pages', async () => {
    const contact = { contactEmail: 'hello@example.com', contactPhone: '+84 (90) 123-4567' };
    const response = await save(contact);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(contact);
    expect((await api.get('/api/admin/settings')).body).toMatchObject(contact);
    expect(await publicSettings()).toMatchObject(contact);
    expect(testApp.revalidateHits.at(-1)).toMatchObject({ scope: 'all' });
  });

  it('hides cleared values and removes omitted ones on a full replacement', async () => {
    await save({ contactEmail: 'hello@example.com', contactPhone: '090 123 4567' });
    await save({ contactEmail: '   ', contactPhone: '' });
    expect(await publicSettings()).not.toHaveProperty('contactEmail');
    expect(await publicSettings()).not.toHaveProperty('contactPhone');
    await save({ contactEmail: 'hello@example.com' });
    await save({});
    expect((await api.get('/api/admin/settings')).body).not.toHaveProperty('contactEmail');
  });

  it('rejects invalid details with field errors and ignores malformed stored contacts', async () => {
    const response = await save({ contactEmail: 'hello', contactPhone: 'javascript:1' });
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty('contactEmail');
    expect(response.body.error.fields).toHaveProperty('contactPhone');
    await SettingsModel.create({ singleton: 'site', ...base, contactEmail: 'hello', contactPhone: 'javascript:1' });
    expect(await publicSettings()).not.toHaveProperty('contactEmail');
    expect(await publicSettings()).not.toHaveProperty('contactPhone');
  });
});
