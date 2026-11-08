import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { adminApi, buildCollectionPayload, createCollectionVia, createOutfitVia, type Agent } from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Agent;
let api: ReturnType<typeof adminApi>;

beforeAll(async () => {
  testApp = await startTestApp();
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([CollectionModel.deleteMany({}), OutfitModel.deleteMany({})]);
  testApp.revalidateHits.length = 0;
});

describe('admin collections: access', () => {
  it('rejects every route without a session', async () => {
    const anonymous = supertest(testApp.app);
    expect((await anonymous.get('/api/admin/collections')).status).toBe(401);
    expect((await anonymous.get('/api/admin/collections/64b7f0c2a1b2c3d4e5f60801')).status).toBe(401);
    expect((await anonymous.get('/api/admin/home')).status).toBe(401);
  });
});

describe('admin collections: CRUD', () => {
  it('creates with an incrementing order, then reads back with usage', async () => {
    const first = await createCollectionVia(agent, { slug: 'first', name: 'First' });
    const second = await createCollectionVia(agent, { slug: 'second', name: 'Second' });
    expect(second.order).toBe(first.order + 1);

    const detail = await api.get(`/api/admin/collections/${first.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      slug: 'first',
      status: 'published',
      usage: { outfitCount: 0, usedInDraft: false, usedInPublished: false },
    });
    expect(detail.body.coverImage.url).toBe('http://cdn.test/media/public/model/2026/11/cover.webp');
  });

  it('lists in display order with outfit counts, filters and pagination', async () => {
    const one = await createCollectionVia(agent, { slug: 'one', name: 'Alpha look' });
    await createCollectionVia(agent, { slug: 'two', name: 'Beta', status: 'draft', coverImage: undefined });
    const outfit = await createOutfitVia(agent, 'in-one');
    await api.post(`/api/admin/collections/${one.id}/outfits`, { outfitIds: [outfit.id] });

    const all = await api.get('/api/admin/collections');
    expect(all.body.items.map((item: { slug: string }) => item.slug)).toEqual(['one', 'two']);
    expect(all.body.items[0]).toMatchObject({ outfitCount: 1, coverImageUrl: expect.stringContaining('cover.webp') });
    expect(all.body.items[1]).toMatchObject({ outfitCount: 0, coverImageUrl: null });

    expect((await api.get('/api/admin/collections?status=draft')).body.total).toBe(1);
    expect((await api.get('/api/admin/collections?q=alpha')).body.items).toHaveLength(1);
    const paged = await api.get('/api/admin/collections?size=1&page=2');
    expect(paged.body).toMatchObject({ total: 2, page: 2, size: 1 });
    expect(paged.body.items[0].slug).toBe('two');
  });

  it('updates fields, clears optional ones and revalidates the old and new slug', async () => {
    const created = await createCollectionVia(agent, { slug: 'old-slug', description: 'Old text' });
    testApp.revalidateHits.length = 0;

    const updated = await api.put(
      `/api/admin/collections/${created.id}`,
      buildCollectionPayload({ slug: 'new-slug', name: 'Renamed' }),
    );
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ slug: 'new-slug', name: 'Renamed' });
    expect(updated.body).not.toHaveProperty('description');

    expect(testApp.revalidateHits.at(-1)).toMatchObject({
      paths: ['/', '/collections', '/collections/new-slug', '/collections/old-slug', '/sitemap.xml'],
      tags: ['public-collections', 'public-home', 'public-settings'],
    });
  });

  it('answers 404 for unknown or malformed ids', async () => {
    expect((await api.get('/api/admin/collections/not-an-id')).status).toBe(404);
    expect((await api.put('/api/admin/collections/64b7f0c2a1b2c3d4e5f60801', buildCollectionPayload())).status).toBe(404);
    expect((await api.del('/api/admin/collections/64b7f0c2a1b2c3d4e5f60801')).status).toBe(404);
  });

  it('deletes the collection and revalidates', async () => {
    const created = await createCollectionVia(agent);
    testApp.revalidateHits.length = 0;
    expect((await api.del(`/api/admin/collections/${created.id}`)).status).toBe(204);
    expect(await CollectionModel.countDocuments()).toBe(0);
    expect(testApp.revalidateHits.at(-1)?.paths).toContain('/collections/summer');
  });
});

describe('admin collections: validation', () => {
  it('answers 409 on fields.slug for a duplicate slug, on create and on rename', async () => {
    await createCollectionVia(agent, { slug: 'taken' });
    const duplicate = await api.post('/api/admin/collections', buildCollectionPayload({ slug: 'taken' }));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.fields).toHaveProperty('slug');

    const other = await createCollectionVia(agent, { slug: 'other' });
    const rename = await api.put(`/api/admin/collections/${other.id}`, buildCollectionPayload({ slug: 'taken' }));
    expect(rename.status).toBe(409);
    expect(rename.body.error.fields).toHaveProperty('slug');
  });

  it('requires a cover image to publish and rejects the reserved slug', async () => {
    const noCover = await api.post('/api/admin/collections', buildCollectionPayload({ coverImage: undefined }));
    expect(noCover.status).toBe(400);
    expect(noCover.body.error.fields).toHaveProperty('coverImage');

    const reserved = await api.post('/api/admin/collections', buildCollectionPayload({ slug: 'slugs' }));
    expect(reserved.status).toBe(400);
    expect(reserved.body.error.fields).toHaveProperty('slug');
  });

  it('rejects image keys outside the public prefix', async () => {
    const response = await api.post(
      '/api/admin/collections',
      buildCollectionPayload({ coverImage: { key: 'private/cover.webp', width: 10, height: 10 } }),
    );
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty(['coverImage.key']);
  });
});
