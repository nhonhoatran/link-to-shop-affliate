import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const normalizeOrigin = (value: string): string => {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim();
  }
};

/** CSRF defence in depth on top of SameSite=Lax: browsers always send Origin on cross-site writes. */
export const createOriginCheck = (allowedOrigins: string): RequestHandler => {
  const allowed = new Set(allowedOrigins.split(',').filter((entry) => entry.trim()).map(normalizeOrigin));
  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (SAFE_METHODS.has(req.method) || !origin || allowed.has(normalizeOrigin(origin))) {
      next();
      return;
    }
    next(new AppError(403, 'FORBIDDEN', 'Nguồn gửi yêu cầu không được phép'));
  };
};
