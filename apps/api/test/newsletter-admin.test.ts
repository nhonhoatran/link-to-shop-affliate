import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NewsletterSubscriberModel } from '../src/models/newsletter-subscriber-model';
import { adminApi } from './helpers/content-api';
import { TEST_ORIGIN, loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;
let api: ReturnType<typeof adminApi>;

beforeAll(async () => {
  testApp = await startTestApp({ ADMIN_PAGE_SIZE_DEFAULT: '2', ADMIN_PAGE_SIZE_MAX: '3' });
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

const seed = (email: string, status: 'subscribed' | 'unsubscribed', createdAt: Date) =>
  NewsletterSubscriberModel.collection.insertOne({
    email,
    status,
    source: 'home',
    consentedAt: createdAt,
    consentText: 'Đồng ý',
    consentTextVersion: 1,
    events: [{ type: 'subscribe', at: createdAt, actor: 'self', source: 'home', textVersion: 1, consentText: 'Đồng ý' }],
    createdAt,
    updatedAt: createdAt,
  });

beforeEach(async () => {
  await NewsletterSubscriberModel.deleteMany({});
  await seed('anna@example.com', 'subscribed', new Date('2026-11-01T00:00:00Z'));
  await seed('bob@example.com', 'unsubscribed', new Date('2026-11-02T00:00:00Z'));
  await seed('carol+tag@example.com', 'subscribed', new Date('2026-11-03T00:00:00Z'));
});

const idOf = async (email: string) => String((await NewsletterSubscriberModel.findOne({ email }).lean())?._id);

describe('admin newsletter list', () => {
  it('requires a session', async () => {
    expect((await supertest(testApp.app).get('/api/admin/newsletter')).status).toBe(401);
    expect((await supertest(testApp.app).get('/api/admin/newsletter/export')).status).toBe(401);
    expect((await supertest(testApp.app).delete(`/api/admin/newsletter/${await idOf('anna@example.com')}`)).status).toBe(401);
  });

  it('lists newest first with the default page size and the total', async () => {
    const body = (await api.get('/api/admin/newsletter')).body;
    expect(body.items.map((item: { email: string }) => item.email)).toEqual(['carol+tag@example.com', 'bob@example.com']);
    expect(body).toMatchObject({ total: 3, page: 1, size: 2 });
    expect(body.items[0].events[0]).toEqual({ type: 'subscribe', at: '2026-11-03T00:00:00.000Z', actor: 'self', source: 'home', textVersion: 1 });
    expect(body.items[0].events[0].consentText).toBeUndefined();
  });

  it('paginates and clamps size to the maximum', async () => {
    const second = (await api.get('/api/admin/newsletter?page=2')).body;
    expect(second.items.map((item: { email: string }) => item.email)).toEqual(['anna@example.com']);
    expect((await api.get('/api/admin/newsletter?size=50')).body.size).toBe(3);
  });

  it('filters by status and by a case-insensitive email fragment, treating regex characters literally', async () => {
    const unsubscribed = (await api.get('/api/admin/newsletter?status=unsubscribed')).body;
    expect(unsubscribed.items.map((item: { email: string }) => item.email)).toEqual(['bob@example.com']);

    const found = (await api.get('/api/admin/newsletter?q=CAROL%2Btag')).body;
    expect(found.items.map((item: { email: string }) => item.email)).toEqual(['carol+tag@example.com']);

    expect((await api.get('/api/admin/newsletter?q=.*')).body.total).toBe(0);
  });
});

describe('admin newsletter actions', () => {
  it('unsubscribes once and leaves the history alone on repeats', async () => {
    const id = await idOf('anna@example.com');
    const first = await agent.patch(`/api/admin/newsletter/${id}/unsubscribe`).set('Origin', TEST_ORIGIN);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('unsubscribed');
    expect(first.body.events.map((event: { type: string; actor: string }) => [event.type, event.actor])).toEqual([
      ['subscribe', 'self'],
      ['unsubscribe', 'admin'],
    ]);

    const second = await agent.patch(`/api/admin/newsletter/${id}/unsubscribe`).set('Origin', TEST_ORIGIN);
    expect(second.status).toBe(200);
    expect(second.body.events).toHaveLength(2);
    expect(second.body.updatedAt).toBe(first.body.updatedAt);
  });

  it('answers 404 for an unknown or malformed id', async () => {
    const missing = '64b7f0c2a1b2c3d4e5f60999';
    expect((await agent.patch(`/api/admin/newsletter/${missing}/unsubscribe`).set('Origin', TEST_ORIGIN)).status).toBe(404);
    expect((await agent.patch('/api/admin/newsletter/nope/unsubscribe').set('Origin', TEST_ORIGIN)).status).toBe(404);
    expect((await api.del(`/api/admin/newsletter/${missing}`)).status).toBe(404);
    expect((await api.del('/api/admin/newsletter/nope')).status).toBe(404);
  });

  it('deletes for good with 204', async () => {
    const id = await idOf('bob@example.com');
    expect((await api.del(`/api/admin/newsletter/${id}`)).status).toBe(204);
    expect(await NewsletterSubscriberModel.countDocuments({ email: 'bob@example.com' })).toBe(0);
    expect((await api.del(`/api/admin/newsletter/${id}`)).status).toBe(404);
  });
});
