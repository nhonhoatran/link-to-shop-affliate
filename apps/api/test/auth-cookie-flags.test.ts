import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdmin } from '../src/services/admin-user-service';
import { TEST_EMAIL, TEST_ORIGIN, TEST_PASSWORD, startTestApp, type TestApp } from './helpers/test-app';

describe('session cookie Secure flag', () => {
  describe('production default (HTTPS behind the proxy)', () => {
    let testApp: TestApp;
    beforeAll(async () => {
      testApp = await startTestApp({ NODE_ENV: 'production' });
      await createAdmin(TEST_EMAIL, TEST_PASSWORD);
    });
    afterAll(async () => {
      await testApp.stop();
    });

    it('marks the cookie Secure when SESSION_COOKIE_SECURE is unset', async () => {
      expect(testApp.env.SESSION_COOKIE_SECURE).toBe(true);
      const response = await supertest(testApp.app)
        .post('/api/auth/login')
        .set('Origin', TEST_ORIGIN)
        .set('X-Forwarded-Proto', 'https')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      expect(response.status).toBe(200);
      expect(String(response.headers['set-cookie'])).toContain('Secure');
    });
  });

  describe('production over plain HTTP with SESSION_COOKIE_SECURE=false', () => {
    let testApp: TestApp;
    beforeAll(async () => {
      testApp = await startTestApp({ NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' });
      await createAdmin(TEST_EMAIL, TEST_PASSWORD);
    });
    afterAll(async () => {
      await testApp.stop();
    });

    it('still sets a usable cookie without Secure, so login works over HTTP', async () => {
      const agent = supertest.agent(testApp.app);
      const response = await agent
        .post('/api/auth/login')
        .set('Origin', TEST_ORIGIN)
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      expect(response.status).toBe(200);
      const cookie = String(response.headers['set-cookie']);
      expect(cookie).toContain('u30.sid=');
      expect(cookie).not.toContain('Secure');
      expect((await agent.get('/api/auth/me')).status).toBe(200);
    });
  });
});
