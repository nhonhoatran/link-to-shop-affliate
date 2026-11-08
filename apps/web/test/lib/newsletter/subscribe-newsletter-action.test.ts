import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { redirect, revalidateTag, forwardedFor } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidateTag: vi.fn(),
  forwardedFor: { value: '9.9.9.9, 203.0.113.7' as string | null },
}));

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => (name === 'x-forwarded-for' ? forwardedFor.value : null) }),
  cookies: vi.fn(),
}));

import { subscribeNewsletter } from '@/lib/newsletter/subscribe-newsletter-action';

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

const form = (overrides: Record<string, string | null> = {}) => {
  const data = new FormData();
  const fields: Record<string, string | null> = {
    email: ' Ann@Example.com ',
    consent: 'on',
    consentTextVersion: '3',
    sectionId: 'sec 1',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) if (value !== null) data.set(key, value);
  return data;
};

const run = async (data: FormData) => {
  try {
    await subscribeNewsletter(data);
  } catch (error) {
    return (error as Error).message;
  }
  return 'no redirect';
};

let fetchMock: ReturnType<typeof vi.fn>;
const respond = (status: number, body: unknown = {}) => {
  fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
};

beforeEach(() => {
  redirect.mockClear();
  revalidateTag.mockClear();
  forwardedFor.value = '9.9.9.9, 203.0.113.7';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('subscribeNewsletter', () => {
  it('posts the normalised body with the last forwarded IP, then redirects with ok and the anchor', async () => {
    respond(202, { ok: true });
    expect(await run(form())).toBe('REDIRECT:/?newsletter=ok#newsletter-sec%201');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test:4000/api/public/newsletter');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ann@example.com', consent: true, consentTextVersion: 3, source: 'home' });
    expect(init.headers).toMatchObject({ 'x-forwarded-for': '203.0.113.7' });
  });

  it('omits the forwarded header when the request carries none', async () => {
    respond(202);
    forwardedFor.value = null;
    await run(form());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('x-forwarded-for');
  });

  it('answers ok without calling the API when the honeypot is filled', async () => {
    respond(202);
    expect(await run(form({ website: 'http://spam.test' }))).toBe('REDIRECT:/?newsletter=ok#newsletter-sec%201');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing consent', { consent: null }],
    ['bad email', { email: 'nope' }],
    ['bad version', { consentTextVersion: '0' }],
  ])('redirects with invalid and never calls the API on %s', async (_label, overrides) => {
    respond(202);
    expect(await run(form(overrides))).toMatch(/^REDIRECT:\/\?newsletter=invalid/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirects without an anchor when the section id is missing', async () => {
    respond(202);
    expect(await run(form({ sectionId: null }))).toBe('REDIRECT:/?newsletter=invalid');
  });

  it.each([
    [400, 'invalid'],
    [429, 'rate'],
    [500, 'error'],
  ])('maps API status %i to %s', async (status, expected) => {
    respond(status, { error: { code: 'X', message: 'x' } });
    expect(await run(form())).toMatch(`REDIRECT:/?newsletter=${expected}#`);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('expires the home cache on 409 and reports stale', async () => {
    respond(409, { error: { code: 'CONSENT_VERSION_MISMATCH', message: 'x' } });
    expect(await run(form())).toMatch(/^REDIRECT:\/\?newsletter=stale#/);
    expect(revalidateTag).toHaveBeenCalledWith('public-home', { expire: 0 });
  });

  it('reports error on a network failure without logging the email', async () => {
    fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await run(form())).toMatch(/^REDIRECT:\/\?newsletter=error#/);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain('example.com');
  });
});
