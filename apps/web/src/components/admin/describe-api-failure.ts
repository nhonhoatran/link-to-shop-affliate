import { ApiError } from '@/lib/api-client-browser';
import { GENERIC_ERROR } from './admin-copy';
import type { FieldErrors } from './validation-messages';

/** API errors carry their own message and per-field errors; anything else gets the generic sentence. */
export const describeApiFailure = (error: unknown): { message: string; fields: FieldErrors } =>
  error instanceof ApiError
    ? { message: error.message, fields: error.fields ?? {} }
    : { message: GENERIC_ERROR, fields: {} };
