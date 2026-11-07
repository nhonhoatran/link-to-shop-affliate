import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';
import type * as WebEnvModule from '@/lib/web-env';

const { getOutfitSlugs } = vi.hoisted(() => ({ getOutfitSlugs: vi.fn() }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getOutfitSlugs }));
// getWebEnv memoises process.env for the life of the module. Passing a copy skips that cache but still runs the real
// schema, so each test sees the env it stubbed without resetting modules.
vi.mock('@/lib/web-env', async (importOriginal) => {
  const actual = await importOriginal<typeof WebEnvModule>();
  return { ...actual, getWebEnv: () => actual.getWebEnv({ ...process.env }) };
});

beforeEach(() => {
  getOutfitSlugs.mockReset();
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

afterEach(() => vi.unstubAllEnvs());

describe('sitemap', () => {
  it('builds absolute URLs from SITE_URL, ignoring a trailing slash', async () => {
    vi.stubEnv('SITE_URL', 'https://shop.example.test/');
    getOutfitSlugs.mockResolvedValue({
      items: [
        { slug: 'summer-look', updatedAt: '2026-11-01T00:00:00.000Z' },
        { slug: 'áo dài', updatedAt: '2026-11-02T00:00:00.000Z' },
      ],
    });
    expect(await sitemap()).toEqual([
      { url: 'https://shop.example.test/' },
      { url: 'https://shop.example.test/looks' },
      { url: 'https://shop.example.test/look/summer-look', lastModified: '2026-11-01T00:00:00.000Z' },
      { url: 'https://shop.example.test/look/%C3%A1o%20d%C3%A0i', lastModified: '2026-11-02T00:00:00.000Z' },
    ]);
  });

  it('follows SITE_URL when it changes (no hard-coded host)', async () => {
    vi.stubEnv('SITE_URL', 'https://other.example.test');
    getOutfitSlugs.mockResolvedValue({ items: [{ slug: 'a', updatedAt: '2026-11-01T00:00:00.000Z' }] });
    const entries = await sitemap();
    expect(entries[2]?.url).toBe('https://other.example.test/look/a');
  });

  it('lists only the home and looks pages when there are no published outfits', async () => {
    vi.stubEnv('SITE_URL', 'https://shop.example.test');
    getOutfitSlugs.mockResolvedValue({ items: [] });
    expect((await sitemap()).map((entry) => entry.url)).toEqual([
      'https://shop.example.test/',
      'https://shop.example.test/looks',
    ]);
  });
});
