import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { adminApi, createCollectionVia, createOutfitVia, type Agent } from './helpers/content-api';
import { buildOutfitPayload } from './helpers/outfit-payloads';
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

describe('outfit collectionIds', () => {
  it('stores collectionIds on create and returns them', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await api.post('/api/admin/outfits', { ...buildOutfitPayload({ slug: 'with-ids' }), collectionIds: [collection.id] });
    expect(outfit.status).toBe(201);
    expect(outfit.body.collectionIds).toEqual([collection.id]);
    expect((await api.get(`/api/admin/outfits/${outfit.body.id}`)).body.collectionIds).toEqual([collection.id]);
  });

  it('defaults to an empty list when the field is omitted', async () => {
    const outfit = await createOutfitVia(agent, 'no-ids');
    expect((await api.get(`/api/admin/outfits/${outfit.id}`)).body.collectionIds).toEqual([]);
  });

  it('keeps memberships on PUT without collectionIds and replaces them when sent', async () => {
    const a = await createCollectionVia(agent, { slug: 'a' });
    const b = await createCollectionVia(agent, { slug: 'b' });
    const outfit = await createOutfitVia(agent, 'edited', { collectionIds: [a.id] });
    const payload = buildOutfitPayload({ slug: 'edited', title: 'Edited title', status: 'published' });

    const kept = await api.put(`/api/admin/outfits/${outfit.id}`, payload);
    expect(kept.status).toBe(200);
    expect(kept.body.collectionIds).toEqual([a.id]);

    const replaced = await api.put(`/api/admin/outfits/${outfit.id}`, { ...payload, collectionIds: [b.id] });
    expect(replaced.body.collectionIds).toEqual([b.id]);
    const cleared = await api.put(`/api/admin/outfits/${outfit.id}`, { ...payload, collectionIds: [] });
    expect(cleared.body.collectionIds).toEqual([]);
  });

  it('answers 400 on fields.collectionIds for an unknown collection, on create and update', async () => {
    const unknown = '64b7f0c2a1b2c3d4e5f60801';
    const created = await api.post('/api/admin/outfits', { ...buildOutfitPayload({ slug: 'bad-create' }), collectionIds: [unknown] });
    expect(created.status).toBe(400);
    expect(created.body.error.fields).toHaveProperty('collectionIds');

    const outfit = await createOutfitVia(agent, 'bad-update');
    const updated = await api.put(`/api/admin/outfits/${outfit.id}`, {
      ...buildOutfitPayload({ slug: 'bad-update', status: 'published' }),
      collectionIds: [unknown],
    });
    expect(updated.status).toBe(400);
    expect(updated.body.error.fields).toHaveProperty('collectionIds');
  });

  it('filters the admin list by collectionId and validates the id', async () => {
    const collection = await createCollectionVia(agent);
    await createOutfitVia(agent, 'member', { collectionIds: [collection.id] });
    await createOutfitVia(agent, 'outsider');

    const filtered = await api.get(`/api/admin/outfits?collectionId=${collection.id}`);
    expect(filtered.body.items.map((item: { slug: string }) => item.slug)).toEqual(['member']);
    expect(filtered.body.total).toBe(1);
    expect((await api.get('/api/admin/outfits?collectionId=nope')).status).toBe(400);
  });

  it('also refreshes collection and home caches on outfit writes', async () => {
    await createOutfitVia(agent, 'tag-check');
    expect(testApp.revalidateHits.at(-1)?.tags).toEqual(['public-collections', 'public-home']);
  });
});
