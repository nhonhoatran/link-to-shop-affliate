import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LooksPage, { generateMetadata } from '@/app/(public)/looks/page';

const { getPublicOutfitPage, getPublicSettings, notFound } = vi.hoisted(() => ({
  getPublicOutfitPage: vi.fn(),
  getPublicSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicOutfitPage, getPublicSettings }));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 2,
  relatedOutfitsCount: 8,
};
const card = (slug: string) => ({
  slug,
  title: `Title ${slug}`,
  modelImage: { key: `k-${slug}`, url: `/media/${slug}.webp`, width: 400, height: 1000 },
  updatedAt: '2026-11-01T00:00:00.000Z',
});
const search = (page?: string | string[]) => ({ searchParams: Promise.resolve(page === undefined ? {} : { page }) });

beforeEach(() => {
  getPublicOutfitPage.mockReset().mockResolvedValue({ items: [card('a'), card('b')], total: 5, page: 1, size: 2 });
  getPublicSettings.mockReset().mockResolvedValue(settings);
  notFound.mockClear();
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

describe('/looks', () => {
  it('asks the API for page 1 with the configured page size and renders cards as h2', async () => {
    render(await LooksPage(search()));
    expect(getPublicOutfitPage).toHaveBeenCalledWith(1, settings.looksPageSize);
    expect(screen.getByRole('heading', { level: 1, name: 'Tất cả outfit' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Title a' })).toHaveAttribute('href', '/look/a');
  });

  it('requests page 2 and marks it as the current pagination page', async () => {
    getPublicOutfitPage.mockResolvedValue({ items: [card('c')], total: 5, page: 2, size: 2 });
    render(await LooksPage(search('2')));
    expect(getPublicOutfitPage).toHaveBeenCalledWith(2, settings.looksPageSize);
    expect(screen.getByRole('link', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');
  });

  it.each(['abc', '0', '-3', '1.5', ''])('treats page=%j as page 1', async (raw) => {
    render(await LooksPage(search(raw)));
    expect(getPublicOutfitPage).toHaveBeenCalledWith(1, settings.looksPageSize);
  });

  it('calls notFound() when the page is beyond the last one', async () => {
    getPublicOutfitPage.mockResolvedValue({ items: [], total: 5, page: 999, size: 2 });
    await expect(LooksPage(search('999'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows the empty message instead of a 404 when there are no outfits at all', async () => {
    getPublicOutfitPage.mockResolvedValue({ items: [], total: 0, page: 1, size: 2 });
    render(await LooksPage(search('3')));
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Chưa có outfit nào' })).toBeInTheDocument();
  });

  it('builds canonical /looks for page 1 and /looks?page=n otherwise', async () => {
    expect((await generateMetadata(search())).alternates?.canonical).toBe('https://shop.example.test/looks');
    const second = await generateMetadata(search('2'));
    expect(second.alternates?.canonical).toBe('https://shop.example.test/looks?page=2');
    expect(second.title).toContain('Trang 2');
  });
});
