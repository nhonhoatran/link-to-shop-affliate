import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { adminApi, createCollectionVia, createOutfitVia, type Agent } from './helpers/content-api';
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

const memberIds = async (outfitId: string): Promise<string[]> =>
  ((await OutfitModel.findById(outfitId).lean())?.collectionIds ?? []).map(String);

describe('collection membership', () => {
  it('adds outfits idempotently and reports the count in usage', async () => {
    const collection = await createCollectionVia(agent);
    const a = await createOutfitVia(agent, 'look-a');
    const b = await createOutfitVia(agent, 'look-b');

    const first = await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [a.id, b.id] });
    expect(first.status).toBe(200);
    expect(first.body.usage.outfitCount).toBe(2);
    const again = await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [a.id] });
    expect(again.body.usage.outfitCount).toBe(2);
    expect(await memberIds(a.id)).toEqual([collection.id]);
  });

  it('does not change the outfit updatedAt, which public lists sort by', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await createOutfitVia(agent, 'stable-order');
    const before = (await OutfitModel.findById(outfit.id).lean())?.updatedAt;
    await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [outfit.id] });
    await api.del(`/api/admin/collections/${collection.id}/outfits/${outfit.id}`);
    expect((await OutfitModel.findById(outfit.id).lean())?.updatedAt).toEqual(before);
  });

  it('answers 400 on fields.outfitIds for an unknown outfit and adds nothing', async () => {
    const collection = await createCollectionVia(agent);
    const real = await createOutfitVia(agent, 'real-look');
    const response = await api.post(`/api/admin/collections/${collection.id}/outfits`, {
      outfitIds: [real.id, '64b7f0c2a1b2c3d4e5f60801'],
    });
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty('outfitIds');
    expect(await memberIds(real.id)).toEqual([]);
  });

  it('removes one outfit and answers 404 for an unknown collection', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await createOutfitVia(agent, 'removable');
    await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [outfit.id] });

    const removed = await api.del(`/api/admin/collections/${collection.id}/outfits/${outfit.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.usage.outfitCount).toBe(0);
    expect((await api.del(`/api/admin/outfits/${outfit.id}`)).status).toBe(204);
    expect((await api.post('/api/admin/collections/64b7f0c2a1b2c3d4e5f60801/outfits', { outfitIds: [outfit.id] })).status).toBe(404);
  });

  it('revalidates the collection pages and tags on every membership write', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await createOutfitVia(agent, 'tracked');
    testApp.revalidateHits.length = 0;
    await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [outfit.id] });
    await api.del(`/api/admin/collections/${collection.id}/outfits/${outfit.id}`);
    expect(testApp.revalidateHits).toHaveLength(2);
    for (const hit of testApp.revalidateHits) {
      expect(hit.paths).toContain('/collections/summer');
      expect(hit.tags).toEqual(['public-collections', 'public-home', 'public-settings']);
    }
  });

  it('removes the collection from every outfit when it is deleted', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await createOutfitVia(agent, 'orphaned');
    await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [outfit.id] });
    expect((await api.del(`/api/admin/collections/${collection.id}`)).status).toBe(204);
    expect(await memberIds(outfit.id)).toEqual([]);
  });
});

describe('collection order', () => {
  const slugs = async (): Promise<string[]> =>
    ((await api.get('/api/admin/collections')).body.items as { slug: string }[]).map((item) => item.slug);

  it('swaps with the neighbour and leaves the ends unchanged', async () => {
    const a = await createCollectionVia(agent, { slug: 'a' });
    const b = await createCollectionVia(agent, { slug: 'b' });
    const c = await createCollectionVia(agent, { slug: 'c' });

    expect((await api.post(`/api/admin/collections/${a.id}/move`, { direction: 'up' })).status).toBe(200);
    expect(await slugs()).toEqual(['a', 'b', 'c']);
    expect((await api.post(`/api/admin/collections/${c.id}/move`, { direction: 'down' })).status).toBe(200);
    expect(await slugs()).toEqual(['a', 'b', 'c']);

    await api.post(`/api/admin/collections/${c.id}/move`, { direction: 'up' });
    expect(await slugs()).toEqual(['a', 'c', 'b']);
    await api.post(`/api/admin/collections/${a.id}/move`, { direction: 'down' });
    expect(await slugs()).toEqual(['c', 'a', 'b']);
    expect((await api.get(`/api/admin/collections/${b.id}`)).body.order).toBe(2);
  });

  it('repairs duplicate order values when moving', async () => {
    const a = await createCollectionVia(agent, { slug: 'a' });
    const b = await createCollectionVia(agent, { slug: 'b' });
    await CollectionModel.updateMany({}, { $set: { order: 5 } });
    await api.post(`/api/admin/collections/${b.id}/move`, { direction: 'up' });
    expect(await slugs()).toEqual(['b', 'a']);
    expect((await api.get(`/api/admin/collections/${a.id}`)).body.order).toBe(1);
  });

  it('answers 404 when moving an unknown collection and 400 for a bad direction', async () => {
    const a = await createCollectionVia(agent);
    expect((await api.post('/api/admin/collections/64b7f0c2a1b2c3d4e5f60801/move', { direction: 'up' })).status).toBe(404);
    expect((await api.post(`/api/admin/collections/${a.id}/move`, { direction: 'sideways' })).status).toBe(400);
  });
});
