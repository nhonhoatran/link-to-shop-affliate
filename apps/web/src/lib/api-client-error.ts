import type { ApiErrorBody } from '@under30ss/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

const isErrorBody = (value: unknown): value is ApiErrorBody => {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const inner = (value as { error: unknown }).error;
  return (
    typeof inner === 'object' &&
    inner !== null &&
    typeof (inner as { code?: unknown }).code === 'string' &&
    typeof (inner as { message?: unknown }).message === 'string'
  );
};

export const networkError = (cause: unknown): ApiError =>
  new ApiError(0, {
    code: NETWORK_ERROR_CODE,
    message: cause instanceof Error ? cause.message : 'Network request failed',
  });

export const readApiResponse = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(response.status, { code: 'INVALID_RESPONSE', message: 'Response is not valid JSON' });
    }
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    parsed = undefined;
  }
  throw new ApiError(
    response.status,
    isErrorBody(parsed)
      ? parsed.error
      : { code: 'HTTP_ERROR', message: response.statusText || `Request failed with ${response.status}` },
  );
};
