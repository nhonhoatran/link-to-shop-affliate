import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import { API_PATHS } from '@under30ss/shared';
import type { AppContext } from './lib/app-context';
import { createJsonOnly } from './middleware/json-only-middleware';
import { createOriginCheck } from './middleware/origin-check-middleware';
import { errorHandler, notFoundHandler } from './middleware/error-handler-middleware';
import { requireAdmin } from './middleware/require-admin-middleware';
import { createSessionMiddleware } from './middleware/session-middleware';
import { createAdminMediaRoutes } from './routes/admin-media-routes';
import { createAdminOutfitRoutes } from './routes/admin-outfit-routes';
import { createAdminSettingsRoutes } from './routes/admin-settings-routes';
import { createAdminUserRoutes } from './routes/admin-user-routes';
import { createAuthRoutes } from './routes/auth-routes';
import { createHealthRoutes } from './routes/health-routes';
import { createPublicRoutes } from './routes/public-outfit-routes';

// Outfit payloads (<= 30 items) are small; uploads go through multer, not this parser.
const JSON_BODY_LIMIT = '1mb';

/** Requires an open Mongo connection (the session store reuses it). */
export const createApp = (ctx: AppContext): Express => {
  const app = express();
  app.disable('x-powered-by');
  // Behind Caddy in production: needed for secure cookies and correct client IPs.
  if (ctx.env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(createOriginCheck(ctx.env.ALLOWED_ORIGIN));
  app.use(createJsonOnly(API_PATHS.admin.media));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(createSessionMiddleware(ctx.env));

  const admin = Router();
  admin.use(requireAdmin);
  admin.use('/outfits', createAdminOutfitRoutes(ctx));
  admin.use('/settings', createAdminSettingsRoutes(ctx));
  admin.use('/admins', createAdminUserRoutes());
  admin.use('/media', createAdminMediaRoutes(ctx));

  const api = Router();
  api.use('/health', createHealthRoutes());
  api.use('/auth', createAuthRoutes(ctx.env));
  api.use('/public', createPublicRoutes(ctx));
  api.use('/admin', admin);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
