import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_SETTINGS_CACHE_TAG, type PublicOutfitCardDto } from '@under30ss/shared';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/api-client-server', async () => {
  const { ApiError } = await import('@/lib/api-client-error');
  return { ApiError, apiGet };
});
vi.mock('@/lib/web-env', () => ({ getWebEnv: () => ({ PUBLIC_REVALIDATE_SECONDS: 300 }) }));

import { getPublicOutfitPage, getPublicSettings, getRelatedOutfits } from '@/lib/seo/public-data-loaders';

const card = (slug: string): PublicOutfitCardDto => ({
  slug,
  title: slug,
  modelImage: { key: `public/${slug}.webp`, width: 10, height: 10, url: `/media/public/${slug}.webp` },
  updatedAt: '2026-11-07T00:00:00.000Z',
});

const page = (slugs: string[]) => ({ items: slugs.map(card), total: slugs.length, page: 1, size: slugs.length });

beforeEach(() => {
  apiGet.mockReset();
});

describe('getPublicOutfitPage', () => {
  it('requests the page without size so the API uses the configured default', async () => {
    apiGet.mockResolvedValue(page(['a']));
    await getPublicOutfitPage(3);
    expect(apiGet).toHaveBeenCalledWith('/api/public/outfits?page=3', { revalidate: 300 });
  });

  it('passes an explicit size', async () => {
    apiGet.mockResolvedValue(page(['a']));
    await getPublicOutfitPage(2, 24);
    expect(apiGet).toHaveBeenCalledWith('/api/public/outfits?page=2&size=24', { revalidate: 300 });
  });

  it('lets API failures reach the caller', async () => {
    const failure = new Error('boom');
    apiGet.mockRejectedValue(failure);
    await expect(getPublicOutfitPage(1)).rejects.toBe(failure);
  });
});

describe('getRelatedOutfits', () => {
  it('asks for count + 1 and drops the current slug', async () => {
    apiGet.mockResolvedValue(page(['a', 'b', 'c']));
    const related = await getRelatedOutfits('b', 2);
    expect(apiGet).toHaveBeenCalledWith('/api/public/outfits?page=1&size=3', { revalidate: 300 });
    expect(related.map((outfit) => outfit.slug)).toEqual(['a', 'c']);
  });

  it('cuts to count when the current slug is not in the list', async () => {
    apiGet.mockResolvedValue(page(['a', 'b', 'c']));
    expect((await getRelatedOutfits('zzz', 2)).map((outfit) => outfit.slug)).toEqual(['a', 'b']);
  });

  it('returns an empty list when the current outfit is the only one', async () => {
    apiGet.mockResolvedValue(page(['a']));
    expect(await getRelatedOutfits('a', 8)).toEqual([]);
  });
});

describe('getPublicSettings', () => {
  it('tags the fetch so a settings change can expire it', async () => {
    apiGet.mockResolvedValue({});
    await getPublicSettings();
    expect(apiGet).toHaveBeenCalledWith('/api/public/settings', { revalidate: 300, tags: [PUBLIC_SETTINGS_CACHE_TAG] });
  });
});
