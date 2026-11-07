import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import type { Env } from '../config/env-config';
import { AppError } from '../lib/app-error';
import { hasValidDeviceCookie, normalizeEmail } from '../lib/device-cookie';
import type { LoginRateLimitConfig } from '../lib/runtime-defaults';

const TOO_MANY_MESSAGE = 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau';

const emailOf = (req: Request): string => normalizeEmail((req.body as { email?: unknown } | undefined)?.email);

const maskEmail = (email: string): string => {
  const at = email.indexOf('@');
  return at > 0 ? `${email[0]}***${email.slice(at)}` : '***';
};

const shared: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', TOO_MANY_MESSAGE)),
};

// Only 4xx answers other than 429 reveal a rejected guess. A 429 (blocked by a limiter) or a 5xx
// (argon2 queue full = 503) says nothing about the guess and must not eat the owner's own quota.
const failureOnly: Partial<Options> = {
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 || res.statusCode === 429 || res.statusCode >= 500,
};

/**
 * Three independent limits, all must pass:
 * - per IP, every attempt: stops password spraying across many emails;
 * - per IP + email, failures only (strict): stops guessing one account from one address;
 * - per email from all IPs, failures only (loose): backstop for distributed guessing. A browser holding a valid
 *   device cookie for that email skips it, so an attacker spreading failures over many IPs cannot lock the owner out.
 * Requests without a usable email skip the email-keyed limiters; the per-IP limiter still applies.
 */
export const createLoginRateLimit = (
  { windowMs, maxAttemptsPerIp, maxFailuresPerIpEmail, maxFailuresPerEmail }: LoginRateLimitConfig,
  env: Pick<Env, 'SESSION_SECRET'>,
): RequestHandler[] => [
  rateLimit({
    ...shared,
    windowMs,
    limit: maxAttemptsPerIp,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  }),
  rateLimit({
    ...shared,
    ...failureOnly,
    windowMs,
    limit: maxFailuresPerIpEmail,
    skip: (req) => emailOf(req) === '',
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|${emailOf(req)}`,
  }),
  rateLimit({
    ...shared,
    ...failureOnly,
    windowMs,
    limit: maxFailuresPerEmail,
    skip: (req) => {
      const email = emailOf(req);
      return email === '' || hasValidDeviceCookie(req, env.SESSION_SECRET, email);
    },
    keyGenerator: (req) => emailOf(req),
    handler: (req, _res, next) => {
      console.warn(`[api] per-email login limit reached for ${maskEmail(emailOf(req))}; requests without a device cookie are blocked`);
      next(new AppError(429, 'RATE_LIMITED', TOO_MANY_MESSAGE));
    },
  }),
];
