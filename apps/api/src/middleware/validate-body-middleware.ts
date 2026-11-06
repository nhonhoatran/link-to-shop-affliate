import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../lib/app-error';
import { zodIssuesToFields } from '../lib/zod-fields';

export const validateBody =
  <T>(schema: ZodType<T>): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      next(badRequest('Dữ liệu không hợp lệ', zodIssuesToFields(result.error.issues)));
      return;
    }
    req.body = result.data;
    next();
  };
