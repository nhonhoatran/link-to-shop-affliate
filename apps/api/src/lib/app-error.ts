import type { ErrorCode } from '@under30ss/shared';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message = 'Không tìm thấy dữ liệu'): AppError => new AppError(404, 'NOT_FOUND', message);
export const unauthorized = (message = 'Vui lòng đăng nhập'): AppError => new AppError(401, 'UNAUTHORIZED', message);
export const conflict = (message: string, fields?: Record<string, string>): AppError =>
  new AppError(409, 'CONFLICT', message, fields);
export const badRequest = (message: string, fields?: Record<string, string>): AppError =>
  new AppError(400, 'VALIDATION_ERROR', message, fields);
