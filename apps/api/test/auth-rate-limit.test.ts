import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createAdmin } from '../src/services/admin-user-service';
import { TEST_EMAIL, TEST_ORIGIN, TEST_PASSWORD, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp | undefined;

afterEach(async () => {
  delete process.env.LOGIN_RATE_LIMIT_MAX_FAILURES;
  delete process.env.LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL;
  delete process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP;
  await testApp?.stop();
  testApp = undefined;
});

const attempt = (app: TestApp['app'], body: { email: string; password: string }, forwardedFor?: string) =>
  supertest(app)
    .post('/api/auth/login')
    .set('Origin', TEST_ORIGIN)
    .set(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {})
    .send(body);

describe('login rate limits', () => {
  it('blocks one IP that rotates through many emails, even though each email fails only once', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP = '3';
    testApp = await startTestApp();
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);

    const statuses: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      statuses.push((await attempt(testApp.app, { email: `victim${index}@example.com`, password: 'wrong-password' })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429]);

    const real = await attempt(testApp.app, { email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(real.status).toBe(429);
    expect(real.body.error.code).toBe('RATE_LIMITED');
  });

  it('blocks one email attacked from many IPs only at the loose per-email threshold', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL = '3';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);

    const statuses: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      statuses.push((await attempt(testApp.app, { email: TEST_EMAIL, password: 'wrong-password' }, `203.0.113.${index + 1}`)).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429]);
  });

  it('lets the real admin log in from a fresh IP after an attacker exhausted the strict limit', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES = '5';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);

    const attacker: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      attacker.push((await attempt(testApp.app, { email: TEST_EMAIL, password: 'wrong-password' }, '198.51.100.7')).status);
    }
    expect(attacker).toEqual([401, 401, 401, 401, 401, 429]);

    const attackerWithRightPassword = await attempt(testApp.app, { email: TEST_EMAIL, password: TEST_PASSWORD }, '198.51.100.7');
    expect(attackerWithRightPassword.status).toBe(429);

    const owner = await attempt(testApp.app, { email: TEST_EMAIL, password: TEST_PASSWORD }, '192.0.2.50');
    expect(owner.status).toBe(200);
  });

  it('shares one strict bucket between case and whitespace variants of the same email', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES = '2';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);

    const variants = ['admin@example.com', ' Admin@Example.com ', 'ADMIN@EXAMPLE.COM'];
    const statuses: number[] = [];
    for (const email of variants) {
      statuses.push((await attempt(testApp.app, { email, password: 'wrong-password' }, '198.51.100.8')).status);
    }
    expect(statuses).toEqual([401, 401, 429]);
  });

  it('shares one per-email bucket across IPs for case and whitespace variants', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL = '2';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);

    const variants = ['admin@example.com', '  ADMIN@example.com', 'Admin@Example.com  '];
    const statuses: number[] = [];
    for (const [index, email] of variants.entries()) {
      statuses.push((await attempt(testApp.app, { email, password: 'wrong-password' }, `203.0.113.${index + 1}`)).status);
    }
    expect(statuses).toEqual([401, 401, 429]);
  });

  it('keeps requests without a usable email out of the email-keyed buckets', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES = '1';
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL = '1';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });

    const statuses: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      const body = index % 2 === 0 ? {} : { email: 12 };
      const response = await supertest(testApp.app)
        .post('/api/auth/login')
        .set('Origin', TEST_ORIGIN)
        .set('X-Forwarded-For', `203.0.113.${index + 1}`)
        .send(body);
      statuses.push(response.status);
    }
    expect(statuses).toEqual([400, 400, 400, 400]);
  });
});
