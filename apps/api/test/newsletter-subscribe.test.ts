import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NewsletterSubscriberModel } from '../src/models/newsletter-subscriber-model';
import { SettingsModel } from '../src/models/settings-model';
import { adminApi } from './helpers/content-api';
import { TEST_ORIGIN, loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;
let api: ReturnType<typeof adminApi>;

beforeAll(async () => {
  // Every request shares one IP in tests, so keep the limiter out of the way here; its own test lives elsewhere.
  process.env.NEWSLETTER_RATE_LIMIT_MAX_PER_IP = '1000';
  testApp = await startTestApp();
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  delete process.env.NEWSLETTER_RATE_LIMIT_MAX_PER_IP;
  await testApp.stop();
});

const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };
const saveConsent = (text: string) => api.put('/api/admin/settings', { ...base, newsletterConsent: { text } });

const subscribe = (body: object) => supertest(testApp.app).post('/api/public/newsletter').send(body);
const valid = (email: string, version = 1) => ({ email, consent: true, consentTextVersion: version, source: 'home' });

beforeEach(async () => {
  await Promise.all([NewsletterSubscriberModel.deleteMany({}), SettingsModel.deleteMany({})]);
  expect((await saveConsent('Tôi đồng ý nhận email.')).status).toBe(200);
});

describe('POST /api/public/newsletter', () => {
  it('stores a new subscriber with a consent snapshot and answers 202', async () => {
    const response = await subscribe(valid('New@Example.com'));
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ ok: true });

    const stored = await NewsletterSubscriberModel.findOne({ email: 'new@example.com' }).lean();
    expect(stored).toMatchObject({ status: 'subscribed', source: 'home', consentText: 'Tôi đồng ý nhận email.', consentTextVersion: 1 });
    expect(stored?.events).toHaveLength(1);
    expect(stored?.events[0]).toMatchObject({ type: 'subscribe', actor: 'self', textVersion: 1, consentText: 'Tôi đồng ý nhận email.' });
    expect(Object.keys(stored ?? {}).filter((key) => /ip/i.test(key))).toEqual([]);
  });

  it('answers 202 for an existing address without changing it', async () => {
    await subscribe(valid('dup@example.com'));
    const before = await NewsletterSubscriberModel.findOne({ email: 'dup@example.com' }).lean();
    const again = await subscribe(valid('DUP@example.com'));
    expect(again.status).toBe(202);
    expect(again.body).toEqual({ ok: true });
    const after = await NewsletterSubscriberModel.findOne({ email: 'dup@example.com' }).lean();
    expect(after?.events).toHaveLength(1);
    expect(after?.updatedAt).toEqual(before?.updatedAt);
    expect(await NewsletterSubscriberModel.countDocuments()).toBe(1);
  });

  it('survives two concurrent requests for the same new address', async () => {
    const responses = await Promise.all([subscribe(valid('race@example.com')), subscribe(valid('race@example.com'))]);
    expect(responses.map((response) => response.status)).toEqual([202, 202]);
    expect(await NewsletterSubscriberModel.countDocuments({ email: 'race@example.com' })).toBe(1);
  });

  it('keeps the whole history when someone subscribes again after an admin cancelled them', async () => {
    await subscribe(valid('back@example.com'));
    const stored = await NewsletterSubscriberModel.findOne({ email: 'back@example.com' }).lean();
    const cancelled = await agent.patch(`/api/admin/newsletter/${stored?._id}/unsubscribe`).set('Origin', TEST_ORIGIN);
    expect(cancelled.status).toBe(200);

    await saveConsent('Câu đồng ý mới.');
    const again = await subscribe(valid('back@example.com', 2));
    expect(again.status).toBe(202);

    const after = await NewsletterSubscriberModel.findOne({ email: 'back@example.com' }).lean();
    expect(after?.status).toBe('subscribed');
    expect(after?.unsubscribedAt).toBeUndefined();
    expect(after?.consentText).toBe('Câu đồng ý mới.');
    expect(after?.events.map((event) => [event.type, event.actor])).toEqual([
      ['subscribe', 'self'],
      ['unsubscribe', 'admin'],
      ['subscribe', 'self'],
    ]);
    expect(after?.events[0]?.consentText).toBe('Tôi đồng ý nhận email.');
  });

  it('drops honeypot submissions silently', async () => {
    const response = await subscribe({ ...valid('bot@example.com'), website: 'http://spam.test' });
    expect(response.status).toBe(202);
    expect(await NewsletterSubscriberModel.countDocuments()).toBe(0);
  });

  it('rejects a missing or false consent and malformed input with 400', async () => {
    expect((await subscribe({ ...valid('a@example.com'), consent: false })).status).toBe(400);
    expect((await subscribe({ email: 'a@example.com', consentTextVersion: 1, source: 'home' })).status).toBe(400);
    expect((await subscribe(valid('not-an-email'))).status).toBe(400);
    expect((await subscribe({ ...valid('a@example.com'), source: 'elsewhere' })).status).toBe(400);
    expect(await NewsletterSubscriberModel.countDocuments()).toBe(0);
  });

  it('answers 409 when the consent version is stale', async () => {
    const response = await subscribe(valid('late@example.com', 7));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
    expect(await NewsletterSubscriberModel.countDocuments()).toBe(0);
  });

  it('answers 409 while no consent sentence has been saved', async () => {
    await SettingsModel.deleteMany({});
    expect((await subscribe(valid('early@example.com'))).status).toBe(409);
  });
});
