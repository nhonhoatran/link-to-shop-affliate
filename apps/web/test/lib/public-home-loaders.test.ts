import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_PATHS, PUBLIC_CACHE_TAGS } from '@under30ss/shared';
import { samplePublicHome } from '@under30ss/shared/fixtures';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/api-client-server', async () => {
  const { ApiError } = await import('@/lib/api-client-error');
  return { ApiError, apiGet };
});
vi.mock('@/lib/web-env', () => ({ getWebEnv: () => ({ PUBLIC_REVALIDATE_SECONDS: 300 }) }));

import { getHomePage } from '@/lib/seo/public-home-loaders';

beforeEach(() => {
  apiGet.mockReset();
});

describe('getHomePage', () => {
  it('reads the public home endpoint with the home cache tag and the safety revalidate', async () => {
    apiGet.mockResolvedValue(samplePublicHome);
    await expect(getHomePage()).resolves.toBe(samplePublicHome);
    expect(apiGet).toHaveBeenCalledWith(API_PATHS.public.home, { revalidate: 300, tags: [PUBLIC_CACHE_TAGS.home] });
  });

  it('lets API failures reach the error boundary', async () => {
    const failure = new Error('down');
    apiGet.mockRejectedValue(failure);
    await expect(getHomePage()).rejects.toBe(failure);
  });
});
