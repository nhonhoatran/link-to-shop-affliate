import { PUBLIC_CACHE_TAGS, REVALIDATE_SECRET_HEADER } from '@under30ss/shared';

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));

const SECRET = 'test-secret-0123456789';

const call = async (init: { secret?: string; body?: unknown; raw?: string }) => {
  const { POST } = await import('@/app/api/revalidate/route');
  return POST(
    new Request('http://localhost/api/revalidate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(init.secret !== undefined ? { [REVALIDATE_SECRET_HEADER]: init.secret } : {}),
      },
      body: init.raw ?? JSON.stringify(init.body),
    }),
  );
};

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockReset();
    revalidateTag.mockReset();
    vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
    vi.stubEnv('SITE_URL', 'https://shop.example.test');
    vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
    vi.stubEnv('REVALIDATE_SECRET', SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('revalidates every path with the right secret', async () => {
    const res = await call({ secret: SECRET, body: { paths: ['/', '/look/a'] } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ['/', '/look/a'] });
    expect(revalidatePath.mock.calls).toEqual([['/'], ['/look/a']]);
  });

  it("revalidates the whole site with scope 'all' using the root layout", async () => {
    const res = await call({ secret: SECRET, body: { scope: 'all' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ['/'] });
    expect(revalidatePath.mock.calls).toEqual([['/', 'layout']]);
    expect(revalidateTag.mock.calls).toEqual(
      Object.values(PUBLIC_CACHE_TAGS).map((tag) => [tag, { expire: 0 }]),
    );
    expect(revalidateTag).toHaveBeenCalledTimes(3);
  });

  it('expires only the requested tags and touches no path', async () => {
    const res = await call({ secret: SECRET, body: { tags: ['public-home'] } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ['public-home'] });
    expect(revalidateTag.mock.calls).toEqual([['public-home', { expire: 0 }]]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('handles paths and tags in one request', async () => {
    const res = await call({ secret: SECRET, body: { paths: ['/collections'], tags: ['public-collections', 'public-home'] } });
    expect(res.status).toBe(200);
    expect(revalidatePath.mock.calls).toEqual([['/collections']]);
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(['public-collections', 'public-home']);
  });

  it("rejects scope 'all' with the wrong secret and does not revalidate", async () => {
    const res = await call({ secret: 'wrong-secret-0123456789', body: { scope: 'all' } });
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('answers 500 and does not revalidate when the web environment is invalid', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'short');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await call({ secret: SECRET, body: { paths: ['/'] } });
    expect(res.status).toBe(500);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong secret', 'wrong-secret-0123456789'],
    ['shorter secret', 'x'],
    ['empty secret', ''],
  ])('rejects %s with 401 and does not revalidate', async (_name, secret) => {
    const res = await call({ secret, body: { paths: ['/'] } });
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects a missing secret header with 401', async () => {
    expect((await call({ body: { paths: ['/'] } })).status).toBe(401);
  });

  it.each([
    ['not json', { raw: 'nope' }],
    ['no paths', { body: {} }],
    ['empty paths', { body: { paths: [] } }],
    ['relative path', { body: { paths: ['look/a'] } }],
    ['unknown scope', { body: { scope: 'some' } }],
    ['unknown tag', { body: { tags: ['x'] } }],
    ['known tag mixed with an unknown one', { body: { tags: ['public-home', 'x'] } }],
    ['empty paths and tags', { body: { paths: [], tags: [] } }],
  ])('rejects %s with 400', async (_name, payload) => {
    const res = await call({ secret: SECRET, ...payload });
    expect(res.status).toBe(400);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
