import { cookies } from 'next/headers';
import { ApiError, networkError, readApiResponse } from './api-client-error';
import { getWebEnv } from './web-env';

export interface ApiGetOptions {
  /** Raw Cookie header to forward (see forwardCookieHeader). Disables caching. */
  cookie?: string;
  /** Seconds before the cached response is considered stale; false = cache until revalidated. */
  revalidate?: number | false;
  /** Fetch cache tags, expirable on demand with revalidateTag. */
  tags?: string[];
  signal?: AbortSignal;
}

export const forwardCookieHeader = async (): Promise<string | undefined> => {
  const header = (await cookies()).toString();
  return header === '' ? undefined : header;
};

export const apiGet = async <T>(path: string, options: ApiGetOptions = {}): Promise<T> => {
  const { cookie, revalidate, tags, signal } = options;
  const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    method: 'GET',
    headers: { accept: 'application/json', ...(cookie ? { cookie } : {}) },
    ...(signal ? { signal } : {}),
  };
  if (cookie) {
    init.cache = 'no-store';
  } else if (revalidate !== undefined) {
    init.next = { revalidate, ...(tags ? { tags } : {}) };
  }

  let response: Response;
  try {
    response = await fetch(`${getWebEnv().API_INTERNAL_URL.replace(/\/+$/, '')}${path}`, init);
  } catch (error) {
    throw networkError(error);
  }
  return readApiResponse<T>(response);
};

export { ApiError };
