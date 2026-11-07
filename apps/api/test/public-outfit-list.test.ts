import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
  await OutfitModel.deleteMany({});
  await SettingsModel.deleteMany({});
});

const list = (query = '') => supertest(testApp.app).get(`/api/public/outfits${query}`);
const day = (n: number) => new Date(Date.UTC(2026, 10, n));

const seedFour = async () => {
  await seedOutfit({ slug: 'oldest', updatedAt: day(1) });
  await seedOutfit({ slug: 'newest', updatedAt: day(4) });
  await seedOutfit({ slug: 'middle', updatedAt: day(3) });
  await seedOutfit({ slug: 'older', updatedAt: day(2) });
  await seedOutfit({ slug: 'hidden-draft', status: 'draft', updatedAt: day(5) });
};

describe('GET /api/public/outfits', () => {
  it('lists only published outfits, newest first, with the default size from env', async () => {
    await seedFour();
    const response = await list();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 4, page: 1, size: 2 });
    expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(['newest', 'middle']);
  });

  it('returns card fields only', async () => {
    await seedOutfit({ slug: 'card' });
    const [card] = (await list()).body.items;
    expect(Object.keys(card).sort()).toEqual(['modelImage', 'slug', 'title', 'updatedAt']);
    expect(card.modelImage.url).toBe('http://cdn.test/media/public/model/2026/11/model.webp');
  });

  it('paginates and returns an empty page beyond the end with the right total', async () => {
    await seedFour();
    const second = await list('?page=2');
    expect(second.body.items.map((item: { slug: string }) => item.slug)).toEqual(['older', 'oldest']);
    const beyond = await list('?page=99');
    expect(beyond.status).toBe(200);
    expect(beyond.body).toMatchObject({ items: [], total: 4, page: 99 });
  });

  it('clamps size to PUBLIC_PAGE_SIZE_MAX', async () => {
    await seedFour();
    const response = await list('?size=1000');
    expect(response.body.size).toBe(3);
    expect(response.body.items).toHaveLength(3);
  });

  it('uses the page size saved in settings when size is omitted', async () => {
    await seedFour();
    await SettingsModel.create({ siteName: 'S', seoTitle: 'S', looksPageSize: 3 });
    expect((await list()).body.size).toBe(3);
    expect((await list('?size=1')).body.size).toBe(1);
  });

  it('rejects invalid page and size with 400', async () => {
    for (const query of ['?page=0', '?page=abc', '?size=0', '?size=1.5', '?page=1e300', '?page=100001']) {
      const response = await list(query);
      expect(response.status, query).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('does not shadow the featured and slugs routes', async () => {
    await seedOutfit({ slug: 'star', featured: true });
    expect((await supertest(testApp.app).get('/api/public/outfits/featured')).body.slug).toBe('star');
    expect((await supertest(testApp.app).get('/api/public/outfits/slugs')).body.items).toHaveLength(1);
  });
});
