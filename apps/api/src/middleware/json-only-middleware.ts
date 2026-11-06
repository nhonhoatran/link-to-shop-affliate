import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error';

const hasBody = (headers: Record<string, string | string[] | undefined>): boolean =>
  Boolean(headers['transfer-encoding']) || Number(headers['content-length'] ?? 0) > 0;

/** Rejects non-JSON bodies, except multipart uploads on the explicitly allowed path. */
export const createJsonOnly =
  (multipartPath: string): RequestHandler =>
  (req, _res, next) => {
    if (!hasBody(req.headers) || req.is('json')) {
      next();
      return;
    }
    if (req.path === multipartPath && req.is('multipart/form-data')) {
      next();
      return;
    }
    next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Chỉ chấp nhận dữ liệu JSON'));
  };
