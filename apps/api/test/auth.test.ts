import mongoose from 'mongoose';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAdmin } from '../src/services/admin-user-service';
import { AdminUserModel } from '../src/models/admin-user-model';
import { TEST_EMAIL, TEST_ORIGIN, TEST_PASSWORD, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;

beforeAll(async () => {
  process.env.LOGIN_RATE_LIMIT_MAX_FAILURES = '3';
  testApp = await startTestApp();
  await createAdmin(TEST_EMAIL, TEST_PASSWORD);
});

afterAll(async () => {
  delete process.env.LOGIN_RATE_LIMIT_MAX_FAILURES;
  await testApp.stop();
});

const login = (agent: ReturnType<typeof supertest.agent>, body: object) =>
  agent.post('/api/auth/login').set('Origin', TEST_ORIGIN).send(body);

describe('auth', () => {
  it('health responds ok', async () => {
    const response = await supertest(testApp.app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('health reports 503 when MongoDB is not connected', async () => {
    const spy = vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
    try {
      const response = await supertest(testApp.app).get('/api/health');
      expect(response.status).toBe(503);
      expect(response.body.error.message).toBe('Dịch vụ tạm thời không khả dụng');
    } finally {
      spy.mockRestore();
    }
  });

  it('logs in with correct credentials, never leaks the hash, and keeps the session', async () => {
    const agent = supertest.agent(testApp.app);
    const response = await login(agent, { email: ' Admin@Example.com ', password: TEST_PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: TEST_EMAIL });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(TEST_EMAIL);

    const out = await agent.post('/api/auth/logout').set('Origin', TEST_ORIGIN);
    expect(out.status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a session cookie captured before logout', async () => {
    const agent = supertest.agent(testApp.app);
    const response = await login(agent, { email: TEST_EMAIL, password: TEST_PASSWORD });
    const oldCookie = (response.headers['set-cookie'] as unknown as string[]).find((line) => line.startsWith('u30.sid='))!.split(';')[0]!;
    expect((await supertest(testApp.app).get('/api/auth/me').set('Cookie', oldCookie)).status).toBe(200);

    await agent.post('/api/auth/logout').set('Origin', TEST_ORIGIN);
    const replay = await supertest(testApp.app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(replay.status).toBe(401);
  });

  it('returns the same generic message for a wrong password and an unknown email', async () => {
    const wrongPassword = await login(supertest.agent(testApp.app), { email: TEST_EMAIL, password: 'nope-nope-nope' });
    const unknownEmail = await login(supertest.agent(testApp.app), { email: 'ghost@example.com', password: 'nope-nope-nope' });
    for (const response of [wrongPassword, unknownEmail]) {
      expect(response.status).toBe(401);
      expect(response.body.error).toMatchObject({ code: 'UNAUTHORIZED', message: 'Email hoặc mật khẩu không đúng' });
    }
  });

  it('rejects a malformed login body with field errors', async () => {
    const response = await login(supertest.agent(testApp.app), { email: 'not-an-email' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toHaveProperty('email');
    expect(response.body.error.fields).toHaveProperty('password');
  });

  it('requires a session for admin routes', async () => {
    const response = await supertest(testApp.app).get('/api/admin/outfits');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('revokes access immediately when the admin is deleted', async () => {
    await createAdmin('temp@example.com', TEST_PASSWORD);
    const agent = supertest.agent(testApp.app);
    expect((await login(agent, { email: 'temp@example.com', password: TEST_PASSWORD })).status).toBe(200);
    await AdminUserModel.deleteOne({ email: 'temp@example.com' });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('blocks cross-origin writes and non-JSON bodies', async () => {
    const crossOrigin = await supertest(testApp.app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(crossOrigin.status).toBe(403);
    expect(crossOrigin.body.error.code).toBe('FORBIDDEN');

    const form = await supertest(testApp.app)
      .post('/api/auth/login')
      .set('Origin', TEST_ORIGIN)
      .type('form')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(form.status).toBe(415);
    expect(form.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rate-limits repeated failures per IP and email, then still allows other emails', async () => {
    const agent = supertest.agent(testApp.app);
    const target = 'victim@example.com';
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      statuses.push((await login(agent, { email: target, password: 'wrong-password' })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429]);
    const limited = await login(agent, { email: target, password: 'wrong-password' });
    expect(limited.body.error.code).toBe('RATE_LIMITED');

    const other = await login(agent, { email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(other.status).toBe(200);
  });
});
