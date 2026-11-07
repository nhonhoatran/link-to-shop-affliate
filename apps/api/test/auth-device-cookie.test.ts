import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createAdmin } from '../src/services/admin-user-service';
import { TEST_EMAIL, TEST_ORIGIN, TEST_PASSWORD, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp | undefined;

afterEach(async () => {
  delete process.env.LOGIN_RATE_LIMIT_MAX_FAILURES;
  delete process.env.LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL;
  await testApp?.stop();
  testApp = undefined;
});

const OTHER_EMAIL = 'other@example.com';

interface Attempt {
  email?: string;
  password?: string;
  ip: string;
  cookie?: string;
}

const login = (app: TestApp['app'], { email = TEST_EMAIL, password = TEST_PASSWORD, ip, cookie }: Attempt) =>
  supertest(app)
    .post('/api/auth/login')
    .set('Origin', TEST_ORIGIN)
    .set('X-Forwarded-For', ip)
    .set(cookie ? { Cookie: cookie } : {})
    .send({ email, password });

const deviceCookieOf = (response: supertest.Response): string => {
  const header = (response.headers['set-cookie'] as unknown as string[] | undefined)?.find((line) => line.startsWith('u30.dev='));
  if (!header) throw new Error('no device cookie in response');
  return header.split(';')[0]!;
};

const startProduction = async (perEmailLimit: string, strictLimit = '50'): Promise<TestApp> => {
  process.env.LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL = perEmailLimit;
  process.env.LOGIN_RATE_LIMIT_MAX_FAILURES = strictLimit;
  const started = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true' });
  await createAdmin(TEST_EMAIL, TEST_PASSWORD);
  await createAdmin(OTHER_EMAIL, TEST_PASSWORD);
  return started;
};

/** Logs in once (device cookie issued), then exhausts the per-email bucket from other IPs. */
const exhaustPerEmail = async (app: TestApp['app'], limit: number): Promise<string> => {
  const cookie = deviceCookieOf(await login(app, { ip: '192.0.2.10' }));
  for (let index = 0; index < limit; index += 1) {
    expect((await login(app, { password: 'wrong-password', ip: `203.0.113.${index + 1}` })).status).toBe(401);
  }
  expect((await login(app, { password: 'wrong-password', ip: '203.0.113.99' })).status).toBe(429);
  return cookie;
};

describe('device cookie', () => {
  it('is issued on login as a signed httpOnly cookie that follows the session Secure rule', async () => {
    testApp = await startProduction('3');
    const response = await login(testApp.app, { ip: '192.0.2.10' });
    const header = (response.headers['set-cookie'] as unknown as string[]).find((line) => line.startsWith('u30.dev='))!;
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Max-Age=7776000/);
  });

  it('is not issued when the login fails', async () => {
    testApp = await startProduction('3');
    const response = await login(testApp.app, { password: 'wrong-password', ip: '192.0.2.10' });
    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('lets its holder log in while the per-email bucket is exhausted, but not an attacker without it', async () => {
    testApp = await startProduction('3');
    const cookie = await exhaustPerEmail(testApp.app, 3);

    const attacker = await login(testApp.app, { ip: '198.51.100.20' });
    expect(attacker.status).toBe(429);
    expect(attacker.body.error.code).toBe('RATE_LIMITED');

    const owner = await login(testApp.app, { ip: '198.51.100.21', cookie });
    expect(owner.status).toBe(200);
  });

  it('ignores a forged or tampered cookie', async () => {
    testApp = await startProduction('3');
    const cookie = await exhaustPerEmail(testApp.app, 3);
    const flipped = `${cookie.slice(0, -1)}${cookie.endsWith('A') ? 'B' : 'A'}`;

    for (const forged of ['u30.dev=forged-value', 'u30.dev=', flipped, `${cookie}extra`]) {
      expect((await login(testApp.app, { ip: '198.51.100.30', cookie: forged })).status).toBe(429);
    }
  });

  it('ignores a cookie that was issued for another email', async () => {
    testApp = await startProduction('3');
    await exhaustPerEmail(testApp.app, 3);
    const otherCookie = deviceCookieOf(await login(testApp.app, { email: OTHER_EMAIL, ip: '192.0.2.11' }));

    expect((await login(testApp.app, { ip: '198.51.100.40', cookie: otherCookie })).status).toBe(429);
  });

  it('still applies the per-IP + email limit to a cookie holder', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX_FAILURES = '2';
    testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
    await createAdmin(TEST_EMAIL, TEST_PASSWORD);
    const cookie = deviceCookieOf(await login(testApp.app, { ip: '192.0.2.10' }));

    const statuses: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      statuses.push((await login(testApp.app, { password: 'wrong-password', ip: '198.51.100.50', cookie })).status);
    }
    expect(statuses).toEqual([401, 401, 429]);
  });

  it('does not count requests blocked by a limiter (429) as failed logins', async () => {
    testApp = await startProduction('1', '3');
    const cookie = deviceCookieOf(await login(testApp.app, { ip: '192.0.2.10' }));
    expect((await login(testApp.app, { password: 'wrong-password', ip: '203.0.113.1' })).status).toBe(401);

    // Blocked by the per-email bucket: these 429s must not fill the strict IP + email bucket of this IP.
    for (let index = 0; index < 4; index += 1) {
      expect((await login(testApp.app, { password: 'wrong-password', ip: '198.51.100.60' })).status).toBe(429);
    }
    const holder = await login(testApp.app, { password: 'wrong-password', ip: '198.51.100.60', cookie });
    expect(holder.status).toBe(401);
  });
});
