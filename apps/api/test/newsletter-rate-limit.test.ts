import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp | undefined;

afterEach(async () => {
  delete process.env.NEWSLETTER_RATE_LIMIT_MAX_PER_IP;
  await testApp?.stop();
  testApp = undefined;
});

const post = (app: TestApp['app'], body: object, forwardedFor?: string) =>
  supertest(app)
    .post('/api/public/newsletter')
    .set(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {})
    .send(body);

// Invalid on purpose (no consent): the limiter must count requests before validation.
const invalid = { email: 'a@example.com' };

describe('newsletter rate limit', () => {
  it('answers 429 after the per-IP maximum and keeps other IPs separate', async () => {
    process.env.NEWSLETTER_RATE_LIMIT_MAX_PER_IP = '3';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });

    const statuses: number[] = [];
    for (let index = 0; index < 4; index += 1) statuses.push((await post(testApp.app, invalid, '203.0.113.1')).status);
    expect(statuses).toEqual([400, 400, 400, 429]);

    const limited = await post(testApp.app, invalid, '203.0.113.1');
    expect(limited.body.error.code).toBe('RATE_LIMITED');

    expect((await post(testApp.app, invalid, '203.0.113.2')).status).toBe(400);
  });

  it('uses the default maximum of 10 when the env is not set', async () => {
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
    const statuses: number[] = [];
    for (let index = 0; index < 11; index += 1) statuses.push((await post(testApp.app, invalid, '203.0.113.9')).status);
    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
