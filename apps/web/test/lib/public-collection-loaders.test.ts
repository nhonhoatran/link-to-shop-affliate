import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_CACHE_TAGS } from '@under30ss/shared';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/api-client-server', async () => {
  const { ApiError } = await import('@/lib/api-client-error');
  return { ApiError, apiGet };
});
vi.mock('@/lib/web-env', () => ({ getWebEnv: () => ({ PUBLIC_REVALIDATE_SECONDS: 300 }) }));

import { ApiError } from '@/lib/api-client-error';
import {
  getCollectionPage,
  getCollectionSlugs,
  getPublicCollectionPage,
} from '@/lib/seo/public-collection-loaders';

const options = { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.collections] };

beforeEach(() => {
  apiGet.mockReset();
});

describe('getPublicCollectionPage', () => {
  it('requests the page without size so the API uses the configured default', async () => {
    apiGet.mockResolvedValue({ items: [], total: 0, page: 1, size: 12 });
    await getPublicCollectionPage(3);
    expect(apiGet).toHaveBeenCalledWith('/api/public/collections?page=3', options);
  });

  it('passes an explicit size and the collections cache tag', async () => {
    apiGet.mockResolvedValue({ items: [], total: 0, page: 1, size: 8 });
    await getPublicCollectionPage(1, 8);
    expect(apiGet).toHaveBeenCalledWith('/api/public/collections?page=1&size=8', options);
  });

  it('lets API failures reach the caller', async () => {
    const failure = new Error('boom');
    apiGet.mockRejectedValue(failure);
    await expect(getPublicCollectionPage(1)).rejects.toBe(failure);
  });
});

describe('getCollectionPage', () => {
  it('encodes the slug and forwards page and size', async () => {
    apiGet.mockResolvedValue({ collection: {}, outfits: {} });
    await getCollectionPage('mùa hè', 2, 8);
    expect(apiGet).toHaveBeenCalledWith('/api/public/collections/m%C3%B9a%20h%C3%A8?page=2&size=8', options);
  });

  it('returns null on an API 404 (unknown or draft slug)', async () => {
    apiGet.mockRejectedValue(new ApiError(404, { code: 'not_found', message: 'Not found' }));
    await expect(getCollectionPage('nope', 1)).resolves.toBeNull();
  });

  it('propagates other API errors', async () => {
    apiGet.mockRejectedValue(new ApiError(500, { code: 'internal', message: 'Server error' }));
    await expect(getCollectionPage('x', 1)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getCollectionSlugs', () => {
  it('calls the slugs endpoint', async () => {
    apiGet.mockResolvedValue({ items: [] });
    await getCollectionSlugs();
    expect(apiGet).toHaveBeenCalledWith('/api/public/collections/slugs');
  });
});
