import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { adminApi, createCollectionVia, createOutfitVia, type Agent } from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Agent;
let api: ReturnType<typeof adminApi>;
const publicApi = () => supertest(testApp.app);

beforeAll(async () => {
  testApp = await startTestApp({ PUBLIC_LOOKS_PAGE_SIZE: '2', PUBLIC_RELATED_OUTFITS_COUNT: '2', PUBLIC_PAGE_SIZE_MAX: '3' });
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([CollectionModel.deleteMany({}), OutfitModel.deleteMany({})]);
});

describe('public collections', () => {
  it('lists published collections only, in display order, with a page total', async () => {
    await createCollectionVia(agent, { slug: 'visible-a' });
    await createCollectionVia(agent, { slug: 'hidden', status: 'draft', coverImage: undefined });
    await createCollectionVia(agent, { slug: 'visible-b' });

    const response = await publicApi().get('/api/public/collections');
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(['visible-a', 'visible-b']);
    expect(response.body).toMatchObject({ total: 2, page: 1, size: 2 });
    expect(response.body.items[0].coverImage.url).toBe('http://cdn.test/media/public/model/2026/11/cover.webp');
    expect(response.body.items[0]).not.toHaveProperty('status');
  });

  it('paginates with the settings page size and clamps size to the ceiling', async () => {
    for (const slug of ['c1', 'c2', 'c3', 'c4']) await createCollectionVia(agent, { slug });
    const second = await publicApi().get('/api/public/collections?page=2');
    expect(second.body).toMatchObject({ total: 4, page: 2, size: 2 });
    expect(second.body.items.map((item: { slug: string }) => item.slug)).toEqual(['c3', 'c4']);

    const clamped = await publicApi().get('/api/public/collections?size=1000');
    expect(clamped.body.size).toBe(testApp.env.PUBLIC_PAGE_SIZE_MAX);
    expect(clamped.body.items).toHaveLength(3);
  });

  it('serves slugs for the sitemap before the :slug route and skips drafts', async () => {
    await createCollectionVia(agent, { slug: 'live' });
    await createCollectionVia(agent, { slug: 'wip', status: 'draft', coverImage: undefined });
    const response = await publicApi().get('/api/public/collections/slugs');
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(['live']);
    expect(typeof response.body.items[0].updatedAt).toBe('string');
  });

  it('answers 404 for a draft or unknown collection page', async () => {
    await createCollectionVia(agent, { slug: 'wip', status: 'draft', coverImage: undefined });
    expect((await publicApi().get('/api/public/collections/wip')).status).toBe(404);
    expect((await publicApi().get('/api/public/collections/nothing')).status).toBe(404);
  });

  it('shows only published outfits of the collection, newest first, with their own total', async () => {
    const collection = await createCollectionVia(agent, { slug: 'summer', seoDescription: 'Summer picks' });
    const other = await createCollectionVia(agent, { slug: 'winter' });
    const older = await createOutfitVia(agent, 'older');
    const newer = await createOutfitVia(agent, 'newer');
    const hidden = await createOutfitVia(agent, 'hidden-draft', { status: 'draft' });
    const elsewhere = await createOutfitVia(agent, 'elsewhere');
    await api.post(`/api/admin/collections/${collection.id}/outfits`, { outfitIds: [older.id, newer.id, hidden.id] });
    await api.post(`/api/admin/collections/${other.id}/outfits`, { outfitIds: [elsewhere.id] });
    await OutfitModel.updateOne({ slug: 'newer' }, { $set: { updatedAt: new Date(Date.now() + 60_000) } }, { timestamps: false });

    const response = await publicApi().get('/api/public/collections/summer');
    expect(response.status).toBe(200);
    expect(response.body.collection).toMatchObject({ slug: 'summer', name: 'Summer', seoDescription: 'Summer picks' });
    expect(response.body.outfits.items.map((item: { slug: string }) => item.slug)).toEqual(['newer', 'older']);
    expect(response.body.outfits).toMatchObject({ total: 2, page: 1, size: 2 });
    expect(response.body.outfits.items[0].modelImage.url).toContain('http://cdn.test/media/');

    const page2 = await publicApi().get('/api/public/collections/summer?size=1&page=2');
    expect(page2.body.outfits.items.map((item: { slug: string }) => item.slug)).toEqual(['older']);
  });
});
