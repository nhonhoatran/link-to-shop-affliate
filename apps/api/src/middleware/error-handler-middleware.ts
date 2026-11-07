import type { ApiErrorBody } from '@under30ss/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error';
import { zodIssuesToFields } from '../lib/zod-fields';

// Keep in sync with the 413 body in infra/caddy/Caddyfile (edge limit uses the same sentence).
export const FILE_TOO_LARGE_MESSAGE = 'Tệp vượt quá dung lượng cho phép';

interface ErrorResponse {
  status: number;
  body: ApiErrorBody;
}

const respond = (status: number, code: string, message: string, fields?: Record<string, string>): ErrorResponse => ({
  status,
  body: { error: { code, message, ...(fields ? { fields } : {}) } },
});

const duplicateKeyFields = (error: { keyPattern?: Record<string, unknown> }): Record<string, string> =>
  Object.fromEntries(Object.keys(error.keyPattern ?? {}).map((key) => [key, `${key} already exists`]));

export const toErrorResponse = (error: unknown): ErrorResponse => {
  if (error instanceof AppError) return respond(error.status, error.code, error.message, error.fields);
  if (error instanceof ZodError) return respond(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', zodIssuesToFields(error.issues));
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return respond(413, 'PAYLOAD_TOO_LARGE', FILE_TOO_LARGE_MESSAGE);
    return respond(400, 'VALIDATION_ERROR', 'Tệp tải lên không hợp lệ', { file: error.message });
  }
  const candidate = error as { code?: number; type?: string; keyPattern?: Record<string, unknown> };
  if (candidate.code === 11000) return respond(409, 'CONFLICT', 'Dữ liệu bị trùng', duplicateKeyFields(candidate));
  if (candidate.type === 'entity.too.large') return respond(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn');
  if (candidate.type === 'entity.parse.failed') return respond(400, 'VALIDATION_ERROR', 'JSON không hợp lệ');
  return respond(500, 'INTERNAL_ERROR', 'Đã có lỗi xảy ra, vui lòng thử lại');
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy đường dẫn'));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const { status, body } = toErrorResponse(error);
  if (status >= 500) console.error(`[api] ${req.method} ${req.originalUrl}`, error);
  res.status(status).json(body);
};
