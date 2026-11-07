import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutfitModel } from '../src/models/outfit-model';
import { buildOutfitPayload } from './helpers/outfit-payloads';
import { TEST_ORIGIN, loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;

beforeAll(async () => {
  testApp = await startTestApp();
  agent = await loggedInAgent(testApp);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await OutfitModel.deleteMany({});
  testApp.revalidateHits.length = 0;
  testApp.setWebStatus(200);
});

const create = (body: object) => agent.post('/api/admin/outfits').set('Origin', TEST_ORIGIN).send(body);
const update = (id: string, body: object) => agent.put(`/api/admin/outfits/${id}`).set('Origin', TEST_ORIGIN).send(body);
const publicApi = () => supertest(testApp.app);

describe('public outfit API', () => {
  it('hides drafts and exposes published outfits as sorted public DTOs', async () => {
    await create(buildOutfitPayload({ slug: 'hidden-draft' }));
    const published = buildOutfitPayload({ slug: 'live-look', status: 'published' });
    expect((await create(published)).status).toBe(201);

    expect((await publicApi().get('/api/public/outfits/hidden-draft')).status).toBe(404);
    const response = await publicApi().get('/api/public/outfits/live-look');
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual(['item-3', 'item-1', 'item-2']);
    expect(response.body.modelImage.url).toBe('http://cdn.test/media/public/model/2026/11/model.webp');
    expect(response.body).not.toHaveProperty('status');

    const slugs = await publicApi().get('/api/public/outfits/slugs');
    expect(slugs.body.items.map((item: { slug: string }) => item.slug)).toEqual(['live-look']);
  });

  it('serves the featured outfit only while it is published, 404 otherwise', async () => {
    expect((await publicApi().get('/api/public/outfits/featured')).status).toBe(404);
    const main = await create(buildOutfitPayload({ slug: 'main-look', featured: true, status: 'published' }));
    const featured = await publicApi().get('/api/public/outfits/featured');
    expect(featured.status).toBe(200);
    expect(featured.body.slug).toBe('main-look');

    await update(main.body.id, buildOutfitPayload({ slug: 'main-look', status: 'draft' }));
    expect((await publicApi().get('/api/public/outfits/featured')).status).toBe(404);
  });
});

describe('revalidation', () => {
  it('posts the outfit paths with the shared secret, including the old slug after a rename', async () => {
    const created = await create(buildOutfitPayload({ slug: 'old-slug' }));
    expect(testApp.revalidateHits.at(-1)).toEqual({
      secret: 'revalidate-secret-1234',
      paths: ['/', '/looks', '/look/old-slug', '/sitemap.xml'],
    });

    await update(created.body.id, buildOutfitPayload({ slug: 'new-slug' }));
    expect(testApp.revalidateHits.at(-1)?.paths).toEqual(['/', '/looks', '/look/new-slug', '/look/old-slug', '/sitemap.xml']);
  });

  it('does not fail the write when the web app rejects the revalidation', async () => {
    testApp.setWebStatus(500);
    const response = await create(buildOutfitPayload({ slug: 'still-saved' }));
    expect(response.status).toBe(201);
    expect(await OutfitModel.countDocuments({ slug: 'still-saved' })).toBe(1);
  });
});
