import { Router } from 'express';
import { loginInputSchema, type LoginInput } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { setDeviceCookie } from '../lib/device-cookie';
import { unauthorized } from '../lib/app-error';
import { getLoginRateLimit } from '../lib/runtime-defaults';
import { createLoginRateLimit } from '../middleware/login-rate-limit-middleware';
import { requireAdmin } from '../middleware/require-admin-middleware';
import { SESSION_COOKIE_NAME } from '../middleware/session-middleware';
import { validateBody } from '../middleware/validate-body-middleware';
import { authenticate, getAdminById } from '../services/admin-user-service';

const LOGIN_FAILED_MESSAGE = 'Email hoặc mật khẩu không đúng';

export const createAuthRoutes = (env: Env): Router => {
  const router = Router();

  router.post('/login', ...createLoginRateLimit(getLoginRateLimit(), env), validateBody(loginInputSchema), async (req, res) => {
    const { email, password } = req.body as LoginInput;
    const admin = await authenticate(email, password);
    if (!admin) throw unauthorized(LOGIN_FAILED_MESSAGE);
    // New session id on privilege change prevents session fixation.
    await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
    req.session.adminId = admin.id;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
    setDeviceCookie(res, env, email);
    res.json(admin);
  });

  router.post('/logout', async (req, res) => {
    await new Promise<void>((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())));
    res.clearCookie(SESSION_COOKIE_NAME);
    res.status(204).end();
  });

  router.get('/me', requireAdmin, async (req, res) => {
    const admin = await getAdminById(req.session.adminId ?? '');
    if (!admin) throw unauthorized();
    res.json(admin);
  });

  return router;
};
