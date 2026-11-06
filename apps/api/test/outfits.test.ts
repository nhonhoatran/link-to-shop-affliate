import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
const setFeatured = (id: string, featured: boolean) =>
  agent.post(`/api/admin/outfits/${id}/featured`).set('Origin', TEST_ORIGIN).send({ featured });
const publicApi = () => supertest(testApp.app);

describe('admin outfit CRUD', () => {
  it('creates, reads, updates and deletes an outfit with media urls', async () => {
    const created = await create(buildOutfitPayload());
    expect(created.status).toBe(201);
    expect(created.body.modelImage.url).toBe('http://cdn.test/media/public/model/2026/11/model.webp');
    expect(created.body.items[0].image.url).toMatch(/^http:\/\/cdn\.test\/media\/public\/item\//);

    const fetched = await agent.get(`/api/admin/outfits/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.slug).toBe('sample-look');

    const updated = await update(created.body.id, buildOutfitPayload({ title: 'Renamed look' }));
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Renamed look');

    const removed = await agent.delete(`/api/admin/outfits/${created.body.id}`).set('Origin', TEST_ORIGIN);
    expect(removed.status).toBe(204);
    expect((await agent.get(`/api/admin/outfits/${created.body.id}`)).status).toBe(404);
  });

  it('returns 404 for malformed and unknown ids', async () => {
    expect((await agent.get('/api/admin/outfits/not-an-id')).status).toBe(404);
    expect((await agent.get('/api/admin/outfits/64b7f0c2a1b2c3d4e5f60718')).status).toBe(404);
  });

  it('rejects publishing with a missing link, reporting the exact field', async () => {
    const payload = buildOutfitPayload({ status: 'published' });
    payload.items[1] = { ...payload.items[1]!, affiliateUrl: '' };
    const response = await create(payload);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toHaveProperty(['items.1.affiliateUrl']);
  });

  it('rejects non-https links and image keys outside public/', async () => {
    const insecure = buildOutfitPayload();
    insecure.items[0] = { ...insecure.items[0]!, affiliateUrl: 'http://shop.example.com/x' };
    expect((await create(insecure)).body.error.fields).toHaveProperty(['items.0.affiliateUrl']);

    const privateKey = buildOutfitPayload({ modelImage: { key: 'private/model.webp', width: 10, height: 10 } });
    const response = await create(privateKey);
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty(['modelImage.key']);
  });

  it('returns 409 with a slug field on duplicate slugs', async () => {
    await create(buildOutfitPayload());
    const duplicate = await create(buildOutfitPayload());
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatchObject({ code: 'CONFLICT', fields: { slug: expect.any(String) } });
  });

  it('keeps at most one featured outfit', async () => {
    const first = await create(buildOutfitPayload({ slug: 'first', status: 'published', featured: true }));
    const second = await create(buildOutfitPayload({ slug: 'second', status: 'published' }));
    expect(first.body.featured).toBe(true);

    const switched = await setFeatured(second.body.id, true);
    expect(switched.status).toBe(200);
    expect(switched.body.featured).toBe(true);
    expect((await agent.get(`/api/admin/outfits/${first.body.id}`)).body.featured).toBe(false);
    expect(await OutfitModel.countDocuments({ featured: true })).toBe(1);
  });

  it('ignores the featured flag on PUT so a stale editor cannot overwrite it', async () => {
    const featured = await create(buildOutfitPayload({ slug: 'main', status: 'published', featured: true }));
    const other = await create(buildOutfitPayload({ slug: 'other', status: 'published' }));

    const staleSave = await update(featured.body.id, buildOutfitPayload({ slug: 'main', status: 'published', featured: false, title: 'Edited' }));
    expect(staleSave.status).toBe(200);
    expect(staleSave.body).toMatchObject({ title: 'Edited', featured: true });

    const sneaky = await update(other.body.id, buildOutfitPayload({ slug: 'other', status: 'published', featured: true }));
    expect(sneaky.body.featured).toBe(false);
    expect((await OutfitModel.findOne({ featured: true }).lean())?.slug).toBe('main');
  });

  it('refuses to feature a draft and keeps the current featured outfit', async () => {
    const live = await create(buildOutfitPayload({ slug: 'live', status: 'published', featured: true }));
    const draft = await create(buildOutfitPayload({ slug: 'draft' }));

    const response = await setFeatured(draft.body.id, true);
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: 'CONFLICT', message: 'Chỉ đặt nổi bật cho outfit đã đăng' });
    expect((await agent.get(`/api/admin/outfits/${live.body.id}`)).body.featured).toBe(true);

    const createdAsFeaturedDraft = await create(buildOutfitPayload({ slug: 'draft-feature', featured: true }));
    expect(createdAsFeaturedDraft.status).toBe(409);
    expect(await OutfitModel.countDocuments({ slug: 'draft-feature' })).toBe(0);
  });

  it('clears the featured flag when the outfit goes back to draft', async () => {
    const live = await create(buildOutfitPayload({ slug: 'live', status: 'published', featured: true }));
    const unpublished = await update(live.body.id, buildOutfitPayload({ slug: 'live', status: 'draft' }));
    expect(unpublished.body).toMatchObject({ status: 'draft', featured: false });
    expect(await OutfitModel.countDocuments({ featured: true })).toBe(0);
  });

  it('does not clear the current featured outfit when the target id is unknown', async () => {
    const live = await create(buildOutfitPayload({ slug: 'live', status: 'published', featured: true }));
    const response = await setFeatured('64b7f0c2a1b2c3d4e5f60718', true);
    expect(response.status).toBe(404);
    expect((await agent.get(`/api/admin/outfits/${live.body.id}`)).body.featured).toBe(true);
  });

  it('keeps exactly one featured outfit when two requests feature different outfits at once', async () => {
    const first = await create(buildOutfitPayload({ slug: 'first', status: 'published', featured: true }));
    const second = await create(buildOutfitPayload({ slug: 'second', status: 'published' }));
    const third = await create(buildOutfitPayload({ slug: 'third', status: 'published' }));

    const results = await Promise.all([setFeatured(second.body.id, true), setFeatured(third.body.id, true)]);

    expect(results.every((response) => [200, 409].includes(response.status))).toBe(true);
    expect(results.some((response) => response.status === 200)).toBe(true);
    expect(await OutfitModel.countDocuments({ featured: true })).toBe(1);
    expect(first.status).toBe(201);
  });

  it('reports a clear conflict when another request wins the featured race', async () => {
    await create(buildOutfitPayload({ slug: 'live', status: 'published', featured: true }));
    const next = await create(buildOutfitPayload({ slug: 'next', status: 'published' }));
    const duplicateKey = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    const spy = vi
      .spyOn(OutfitModel, 'findOneAndUpdate')
      .mockImplementation((() => ({ lean: () => Promise.reject(duplicateKey) })) as never);
    try {
      const response = await setFeatured(next.body.id, true);
      expect(response.status).toBe(409);
      expect(response.body.error.message).toBe('Outfit nổi bật vừa được thay đổi ở nơi khác, vui lòng thử lại');
    } finally {
      spy.mockRestore();
    }
  });

  it('lists with search, status filter, pagination and env-bound size', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await create(buildOutfitPayload({ slug: `look-${index}`, title: `Look number ${index}` }));
    }
    await create(buildOutfitPayload({ slug: 'summer-dress', title: 'Summer dress v1.0', status: 'published' }));

    const page = await agent.get('/api/admin/outfits?size=4&page=2');
    expect(page.body).toMatchObject({ total: 6, page: 2, size: 4 });
    expect(page.body.items).toHaveLength(2);

    const oversize = await agent.get('/api/admin/outfits?size=100000');
    expect(oversize.body.size).toBe(testApp.env.ADMIN_PAGE_SIZE_MAX);

    expect((await agent.get('/api/admin/outfits?status=published')).body.total).toBe(1);
    expect((await agent.get('/api/admin/outfits?q=NUMBER 3')).body.items[0].slug).toBe('look-3');
    // Regex metacharacters are escaped: "." must not match every slug.
    const dotSearch = await agent.get('/api/admin/outfits?q=.');
    expect(dotSearch.body.items.map((item: { slug: string }) => item.slug)).toEqual(['summer-dress']);
    expect((await agent.get('/api/admin/outfits?page=0')).status).toBe(400);
  });
});

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
      paths: ['/', '/look/old-slug', '/sitemap.xml'],
    });

    await update(created.body.id, buildOutfitPayload({ slug: 'new-slug' }));
    expect(testApp.revalidateHits.at(-1)?.paths).toEqual(['/', '/look/new-slug', '/look/old-slug', '/sitemap.xml']);
  });

  it('does not fail the write when the web app rejects the revalidation', async () => {
    testApp.setWebStatus(500);
    const response = await create(buildOutfitPayload({ slug: 'still-saved' }));
    expect(response.status).toBe(201);
    expect(await OutfitModel.countDocuments({ slug: 'still-saved' })).toBe(1);
  });
});
