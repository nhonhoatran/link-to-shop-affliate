import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/error-handler-middleware';
import { createLoginRateLimit } from '../src/middleware/login-rate-limit-middleware';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(
    '/login',
    ...createLoginRateLimit(
      { windowMs: 60_000, maxAttemptsPerIp: 100, maxFailuresPerIpEmail: 2, maxFailuresPerEmail: 50 },
      { SESSION_SECRET: 'test-session-secret-at-least-32-characters' },
    ),
    (req, res) => {
      res.status(Number(req.query.status ?? 200)).json({});
    },
  );
  app.use(errorHandler);
  return app;
};

const post = (app: express.Express, status: number) =>
  supertest(app).post(`/login?status=${status}`).send({ email: 'admin@example.com' });

describe('login rate limit failure counting', () => {
  it('does not count 5xx answers (e.g. argon2 queue full = 503) as failed logins', async () => {
    const app = buildApp();
    for (let index = 0; index < 5; index += 1) expect((await post(app, 503)).status).toBe(503);

    expect((await post(app, 401)).status).toBe(401);
    expect((await post(app, 401)).status).toBe(401);
    expect((await post(app, 401)).status).toBe(429);
  });

  it('does not count successful answers', async () => {
    const app = buildApp();
    for (let index = 0; index < 5; index += 1) expect((await post(app, 200)).status).toBe(200);
    expect((await post(app, 401)).status).toBe(401);
  });
});
