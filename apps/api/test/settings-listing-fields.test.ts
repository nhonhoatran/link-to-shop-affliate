import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SettingsModel } from '../src/models/settings-model';
import { TEST_ORIGIN, loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;

beforeAll(async () => {
  testApp = await startTestApp({ PUBLIC_LOOKS_PAGE_SIZE: '12', PUBLIC_RELATED_OUTFITS_COUNT: '8', PUBLIC_PAGE_SIZE_MAX: '48' });
  agent = await loggedInAgent(testApp);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await SettingsModel.deleteMany({});
});

const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };
const save = (body: object) => agent.put('/api/admin/settings').set('Origin', TEST_ORIGIN).send({ ...base, ...body });
const publicSettings = () => supertest(testApp.app).get('/api/public/settings');

describe('listing settings', () => {
  it('serves env defaults to the public view and nothing stored to admin', async () => {
    expect((await publicSettings()).body).toMatchObject({ looksPageSize: 12, relatedOutfitsCount: 8 });
    const admin = (await agent.get('/api/admin/settings')).body;
    expect(admin).not.toHaveProperty('looksPageSize');
  });

  it('saves values and returns them in the admin and public views', async () => {
    const saved = await save({ looksPageSize: 24, relatedOutfitsCount: 4 });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ looksPageSize: 24, relatedOutfitsCount: 4 });
    expect((await agent.get('/api/admin/settings')).body).toMatchObject({ looksPageSize: 24, relatedOutfitsCount: 4 });
    expect((await publicSettings()).body).toMatchObject({ looksPageSize: 24, relatedOutfitsCount: 4 });
  });

  it('falls back to env defaults when the fields are left blank', async () => {
    await save({ looksPageSize: 24, relatedOutfitsCount: 4 });
    const cleared = await save({});
    expect(cleared.body).not.toHaveProperty('looksPageSize');
    expect(cleared.body).not.toHaveProperty('relatedOutfitsCount');
    expect((await publicSettings()).body).toMatchObject({ looksPageSize: 12, relatedOutfitsCount: 8 });
  });

  it('rejects values above the ceiling with field errors', async () => {
    const tooBig = await save({ looksPageSize: 49 });
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.fields.looksPageSize).toBe('Tối đa 48 outfit');
    const related = await save({ relatedOutfitsCount: 49 });
    expect(related.status).toBe(400);
    expect(related.body.error.fields.relatedOutfitsCount).toBeTruthy();
    expect((await save({ looksPageSize: 48 })).status).toBe(200);
  });

  it('rejects non-positive values', async () => {
    expect((await save({ looksPageSize: 0 })).status).toBe(400);
    expect((await save({ relatedOutfitsCount: -1 })).status).toBe(400);
  });

  it('persists homeMode and exposes it only when stored', async () => {
    expect((await publicSettings()).body).not.toHaveProperty('homeMode');
    const saved = await save({ homeMode: 'sections' });
    expect(saved.status).toBe(200);
    expect(saved.body.homeMode).toBe('sections');
    expect((await agent.get('/api/admin/settings')).body.homeMode).toBe('sections');
    expect((await publicSettings()).body.homeMode).toBe('sections');
    expect((await save({})).body).not.toHaveProperty('homeMode');
  });

  it('rejects an unknown homeMode', async () => {
    const response = await save({ homeMode: 'grid' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('clamps stored values to the ceiling on read', async () => {
    await SettingsModel.create({ ...base, looksPageSize: 500, relatedOutfitsCount: 60 });
    expect((await publicSettings()).body).toMatchObject({ looksPageSize: 48, relatedOutfitsCount: 48 });
  });
});
