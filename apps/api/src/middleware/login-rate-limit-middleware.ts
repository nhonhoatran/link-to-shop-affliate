import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { AppError } from '../lib/app-error';
import type { LoginRateLimitConfig } from '../lib/runtime-defaults';

const TOO_MANY_MESSAGE = 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau';

const shared: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', TOO_MANY_MESSAGE)),
};

const emailOf = (body: unknown): string => {
  const email = (body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
};

/**
 * Three independent limits, all must pass:
 * - per IP, every attempt: stops password spraying across many emails;
 * - per IP + email, failures only (strict): stops guessing one account from one address;
 * - per email from all IPs, failures only (loose): backstop for distributed guessing that
 *   an attacker needs far more failures than the strict limit allows to lock the real owner out.
 */
export const createLoginRateLimit = ({
  windowMs,
  maxAttemptsPerIp,
  maxFailuresPerIpEmail,
  maxFailuresPerEmail,
}: LoginRateLimitConfig): RequestHandler[] => [
  rateLimit({
    ...shared,
    windowMs,
    limit: maxAttemptsPerIp,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  }),
  rateLimit({
    ...shared,
    windowMs,
    limit: maxFailuresPerIpEmail,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${emailOf(req.body)}`,
  }),
  rateLimit({
    ...shared,
    windowMs,
    limit: maxFailuresPerEmail,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => emailOf(req.body),
  }),
];
