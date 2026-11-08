import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/app-error';
import type { NewsletterRateLimitConfig } from '../lib/runtime-defaults';

const TOO_MANY_MESSAGE = 'Bạn thao tác quá nhanh, vui lòng thử lại sau';

/** Counts every request, valid or not, so a bot cannot probe addresses for free. */
export const createNewsletterRateLimit = ({ windowMs, maxPerIp }: NewsletterRateLimitConfig): RequestHandler =>
  rateLimit({
    windowMs,
    limit: maxPerIp,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', TOO_MANY_MESSAGE)),
  });
