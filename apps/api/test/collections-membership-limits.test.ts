import { MAX_COLLECTIONS_PER_OUTFIT } from '@under30ss/shared';
import { Types } from 'mongoose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

const memberIds = async (outfitId: string): Promise<string[]> =>
  ((await OutfitModel.findById(outfitId).lean())?.collectionIds ?? []).map(String);

const otherIds = (count: number) => Array.from({ length: count }, () => new Types.ObjectId());

describe('collection membership limits', () => {
  it('rejects the whole request when an outfit is at the collection limit', async () => {
    const collection = await createCollectionVia(agent);
    const roomy = await createOutfitVia(agent, 'roomy');
    const full = await createOutfitVia(agent, 'full');
    await OutfitModel.updateOne({ _id: full.id }, { $set: { collectionIds: otherIds(MAX_COLLECTIONS_PER_OUTFIT) } }, { timestamps: false });

    const response = await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [roomy.id, full.id] });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toMatch(new RegExp(`1 outfit.*${MAX_COLLECTIONS_PER_OUTFIT}`));
    expect(response.body.error.fields.outfitIds).toBe(response.body.error.message);
    expect(await memberIds(roomy.id)).toEqual([]);
    expect(await memberIds(full.id)).toHaveLength(MAX_COLLECTIONS_PER_OUTFIT);
  });

  it('still accepts an outfit at the limit that already belongs to the collection', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await createOutfitVia(agent, 'already-in');
    const ids = [...otherIds(MAX_COLLECTIONS_PER_OUTFIT - 1), new Types.ObjectId(collection.id)];
    await OutfitModel.updateOne({ _id: outfit.id }, { $set: { collectionIds: ids } }, { timestamps: false });
    const response = await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [outfit.id] });
    expect(response.status).toBe(200);
    expect(await memberIds(outfit.id)).toHaveLength(MAX_COLLECTIONS_PER_OUTFIT);
  });

  it('removes the membership again and answers 404 when the collection is deleted mid-request', async () => {
    const collection = await createCollectionVia(agent);
    const outfit = await createOutfitVia(agent, 'racing');
    const realExists = CollectionModel.exists.bind(CollectionModel);
    const exists = vi.spyOn(CollectionModel, 'exists');
    exists.mockImplementationOnce(realExists as never);
    exists.mockImplementationOnce((async () => {
      await CollectionModel.deleteOne({ _id: collection.id });
      return null;
    }) as never);

    const response = await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [outfit.id] });
    expect(response.status).toBe(404);
    expect(await memberIds(outfit.id)).toEqual([]);
  });
});
