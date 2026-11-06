import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, readApiResponse } from './api-client-error';
import { apiFetch, uploadMedia } from './api-client-browser';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('readApiResponse', () => {
  it('returns parsed JSON on success and undefined on 204', async () => {
    expect(await readApiResponse<{ a: number }>(jsonResponse({ a: 1 }))).toEqual({ a: 1 });
    expect(await readApiResponse(new Response(null, { status: 204 }))).toBeUndefined();
  });

  it('throws ApiError carrying status, code and field errors', async () => {
    const body = { error: { code: 'VALIDATION_ERROR', message: 'Bad input', fields: { slug: 'Invalid' } } };
    const error = await readApiResponse(jsonResponse(body, 400)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: { slug: 'Invalid' } });
  });

  it('falls back to HTTP_ERROR when the error body is not the contract shape', async () => {
    const error = await readApiResponse(new Response('<html>', { status: 502 })).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });
});

describe('apiFetch', () => {
  it('sends JSON with same-origin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('/api/auth/login', { method: 'POST', json: { email: 'a@b.c' } });
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/auth/login');
    expect(init.credentials).toBe('same-origin');
    expect(init.body).toBe('{"email":"a@b.c"}');
    expect((init.headers as Headers).get('content-type')).toBe('application/json');
  });

  it('maps network failures to ApiError status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(apiFetch('/api/health')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('uploadMedia', () => {
  it('posts multipart form data without forcing a content-type', async () => {
    const result = { key: 'k', width: 1, height: 1, url: 'u' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(result));
    vi.stubGlobal('fetch', fetchMock);
    const out = await uploadMedia(new File(['x'], 'a.png', { type: 'image/png' }), 'item');
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(out).toEqual(result);
    expect(path).toBe('/api/admin/media?kind=item');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Headers).has('content-type')).toBe(false);
  });
});
