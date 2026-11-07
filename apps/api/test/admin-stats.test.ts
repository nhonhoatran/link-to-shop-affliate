import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutfitModel } from '../src/models/outfit-model';
import { seedOutfit } from './helpers/seed-outfits';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

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
});

const day = (n: number) => new Date(Date.UTC(2026, 10, n));

describe('GET /api/admin/stats', () => {
  it('requires an admin session', async () => {
    const response = await supertest(testApp.app).get('/api/admin/stats');
    expect(response.status).toBe(401);
  });

  it('returns zeros and no featured outfit when empty', async () => {
    const response = await agent.get('/api/admin/stats');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      counts: { total: 0, published: 0, draft: 0, publishedMissingAffiliate: 0, draftMissingAffiliate: 0 },
      featured: null,
      recent: [],
    });
  });

  it('counts by status and missing affiliate links', async () => {
    await seedOutfit({ slug: 'pub-ok' });
    await seedOutfit({ slug: 'pub-missing', missingAffiliate: true });
    await seedOutfit({ slug: 'draft-ok', status: 'draft' });
    await seedOutfit({ slug: 'draft-missing-1', status: 'draft', missingAffiliate: true });
    await seedOutfit({ slug: 'draft-missing-2', status: 'draft', missingAffiliate: true });
    const { counts } = (await agent.get('/api/admin/stats')).body;
    expect(counts).toEqual({ total: 5, published: 2, draft: 3, publishedMissingAffiliate: 1, draftMissingAffiliate: 2 });
  });

  it('reports the featured outfit', async () => {
    await seedOutfit({ slug: 'star', featured: true });
    await seedOutfit({ slug: 'other' });
    const { featured } = (await agent.get('/api/admin/stats')).body;
    expect(featured).toMatchObject({ slug: 'star', status: 'published', featured: true });
    expect(featured.modelImageUrl).toBe('http://cdn.test/media/public/model/2026/11/model.webp');
  });

  it('lists the most recently updated outfits, capped by ADMIN_STATS_RECENT_COUNT', async () => {
    for (let n = 1; n <= 7; n += 1) {
      await seedOutfit({ slug: `look-${n}`, status: n % 2 ? 'draft' : 'published', updatedAt: day(n) });
    }
    const { recent } = (await agent.get('/api/admin/stats')).body;
    expect(recent.map((item: { slug: string }) => item.slug)).toEqual(['look-7', 'look-6', 'look-5', 'look-4', 'look-3']);
  });
});
