import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { SettingsModel } from '../src/models/settings-model';
import { seedOutfit } from './helpers/seed-outfits';
import { startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;

beforeAll(async () => {
  testApp = await startTestApp({ PUBLIC_LOOKS_PAGE_SIZE: '2', PUBLIC_RELATED_OUTFITS_COUNT: '2', PUBLIC_PAGE_SIZE_MAX: '3' });
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([OutfitModel.deleteMany({}), CollectionModel.deleteMany({}), SettingsModel.deleteMany({})]);
});

const feed = (query = '') => supertest(testApp.app).get(`/api/public/outfits/feed${query}`);
const day = (n: number) => new Date(Date.UTC(2026, 10, n));
const slugs = (body: { items: { slug: string }[] }) => body.items.map((item) => item.slug);

const seedCollection = (slug: string, status: 'draft' | 'published' = 'published') =>
  CollectionModel.create({ slug, name: slug, status, order: 0, coverImage: { key: 'public/model/2026/11/cover.webp', width: 10, height: 10 } });

const addToCollection = (outfitSlug: string, collectionId: unknown) =>
  OutfitModel.updateOne({ slug: outfitSlug }, { $set: { collectionIds: [collectionId] } });

describe('GET /api/public/outfits/feed', () => {
  it('puts the featured outfit first, then newest, with full outfit fields', async () => {
    await seedOutfit({ slug: 'old', updatedAt: day(1) });
    await seedOutfit({ slug: 'new', updatedAt: day(4) });
    await seedOutfit({ slug: 'star', featured: true, updatedAt: day(2) });
    const response = await feed('?size=3');
    expect(response.status).toBe(200);
    expect(slugs(response.body)).toEqual(['star', 'new', 'old']);
    expect(response.body.items[0].items[0]).toMatchObject({ name: expect.any(String), anchor: expect.any(Object) });
    expect(response.body.items[0].modelImage.url).toBe('http://cdn.test/media/public/model/2026/11/model.webp');
  });

  it('paginates with the default size and reports the total', async () => {
    for (const [slug, n] of [['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5]] as const) await seedOutfit({ slug, updatedAt: day(n) });
    const first = await feed();
    expect(first.body).toMatchObject({ total: 5, page: 1, size: 2 });
    expect(slugs(first.body)).toEqual(['e', 'd']);
    expect(slugs((await feed('?page=3')).body)).toEqual(['a']);
    expect((await feed('?size=1000')).body.size).toBe(3);
  });

  it('excludes draft outfits', async () => {
    await seedOutfit({ slug: 'live' });
    await seedOutfit({ slug: 'hidden', status: 'draft' });
    const response = await feed();
    expect(response.body.total).toBe(1);
    expect(slugs(response.body)).toEqual(['live']);
  });

  it('drops items without an anchor', async () => {
    const created = await seedOutfit({ slug: 'partial' });
    await OutfitModel.collection.updateOne({ _id: created._id }, { $unset: { 'items.0.anchor': '' } });
    const [outfit] = (await feed()).body.items;
    expect(outfit.items).toHaveLength(2);
  });

  it('filters by a published collection', async () => {
    const collection = await seedCollection('summer');
    await seedOutfit({ slug: 'in', updatedAt: day(1) });
    await seedOutfit({ slug: 'out', updatedAt: day(2) });
    await addToCollection('in', collection._id);
    const response = await feed('?collection=summer');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1 });
    expect(slugs(response.body)).toEqual(['in']);
  });

  it('returns 404 for unknown or draft collections', async () => {
    await seedCollection('hidden', 'draft');
    for (const slug of ['hidden', 'missing']) {
      const response = await feed(`?collection=${slug}`);
      expect(response.status, slug).toBe(404);
      expect(response.body.error.message).toBe('Không tìm thấy bộ sưu tập');
    }
  });

  it('rejects invalid query values with 400 and is not shadowed by /outfits/:slug', async () => {
    expect((await feed('?page=0')).status).toBe(400);
    expect((await feed('?collection=Bad Slug!')).status).toBe(400);
    expect((await feed()).status).toBe(200);
  });
});
