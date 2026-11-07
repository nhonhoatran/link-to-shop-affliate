import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureOutfitIndexes } from '../src/db/mongo-connection';
import { OutfitModel } from '../src/models/outfit-model';
import { getFeaturedOutfit } from '../src/services/public-outfit-service';
import { buildOutfitPayload } from './helpers/outfit-payloads';
import { startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await startTestApp();
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await OutfitModel.deleteMany({});
  const indexes = await OutfitModel.collection.indexes();
  if (indexes.some((index) => index.name === 'featured_1')) await OutfitModel.collection.dropIndex('featured_1');
});

const insertFeatured = (slug: string, updatedAt: string) =>
  OutfitModel.collection.insertOne({
    ...buildOutfitPayload({ slug, title: slug, status: 'published', featured: true }),
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
  });

describe('featured outfit index', () => {
  it('builds the partial unique index and then rejects a second featured outfit', async () => {
    await ensureOutfitIndexes();
    await OutfitModel.create(buildOutfitPayload({ slug: 'one', status: 'published', featured: true }));
    await expect(OutfitModel.create(buildOutfitPayload({ slug: 'two', status: 'published', featured: true }))).rejects.toMatchObject({
      code: 11000,
    });
  });

  it('fails with a clear message when duplicate featured outfits already exist', async () => {
    await insertFeatured('one', '2026-11-01T00:00:00Z');
    await insertFeatured('two', '2026-11-02T00:00:00Z');
    await expect(ensureOutfitIndexes()).rejects.toThrow(/Failed to build outfit indexes.*duplicate featured/);
  });

  it('returns the most recently updated featured outfit when duplicates exist', async () => {
    await insertFeatured('older', '2026-11-01T00:00:00Z');
    await insertFeatured('newest', '2026-11-03T00:00:00Z');
    await insertFeatured('middle', '2026-11-02T00:00:00Z');
    expect((await getFeaturedOutfit(testApp.env))?.slug).toBe('newest');
  });
});
