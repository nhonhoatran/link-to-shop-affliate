import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client-error';
import { apiPost } from '@/lib/api-client-server';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000/');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

afterEach(() => vi.unstubAllGlobals());

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('apiPost', () => {
  it('posts JSON uncached to the internal API with extra headers', async () => {
    const fetchMock = stubFetch(Response.json({ ok: true }, { status: 202 }));
    await expect(apiPost('/api/x', { a: 1 }, { headers: { 'x-forwarded-for': '1.2.3.4' } })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test:4000/api/x');
    expect(init.method).toBe('POST');
    expect(init.cache).toBe('no-store');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' });
  });

  it('throws ApiError with the status and code of an error body', async () => {
    stubFetch(Response.json({ error: { code: 'RATE_LIMITED', message: 'slow down' } }, { status: 429 }));
    await expect(apiPost('/api/x', {})).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });

  it('wraps a network failure as ApiError with status 0', async () => {
    stubFetch(new TypeError('fetch failed'));
    const error = await apiPost('/api/x', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0 });
  });
});
