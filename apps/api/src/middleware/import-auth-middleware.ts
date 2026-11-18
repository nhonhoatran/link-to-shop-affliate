import type { RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Env } from '../config/env-config';
import { AppError } from '../lib/app-error';
import { authenticateImporter, type ImportAuth } from '../services/import-auth-service';

export const requireImporter: RequestHandler = async (req, res, next) => {
  res.locals.importAuth = await authenticateImporter(req.headers.authorization);
  next();
};

export const importerAuth = (res: Response): ImportAuth => res.locals.importAuth as ImportAuth;

export const createImportRateLimit = (env: Env): RequestHandler => rateLimit({
  windowMs: env.IMPORT_RATE_LIMIT_WINDOW_MS,
  limit: env.IMPORT_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Đã đạt giới hạn yêu cầu nhập nháp; vui lòng thử lại sau')),
});
