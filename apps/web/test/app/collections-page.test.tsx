import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleCollectionCards } from '@under30ss/shared/fixtures';
import CollectionsPage, { generateMetadata } from '@/app/(public)/collections/page';

const { getPublicCollectionPage, getPublicSettings, notFound } = vi.hoisted(() => ({
  getPublicCollectionPage: vi.fn(),
  getPublicSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/seo/public-collection-loaders', () => ({ getPublicCollectionPage }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 2,
  relatedOutfitsCount: 8,
};
const search = (page?: string | string[]) => ({ searchParams: Promise.resolve(page === undefined ? {} : { page }) });
const list = (total: number, page = 1) => ({ items: sampleCollectionCards.slice(0, 2), total, page, size: 2 });

beforeEach(() => {
  getPublicCollectionPage.mockReset().mockResolvedValue(list(5));
  getPublicSettings.mockReset().mockResolvedValue(settings);
  notFound.mockClear();
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

describe('/collections', () => {
  it('asks for page 1 with the configured page size and uses the default label as h1', async () => {
    render(await CollectionsPage(search()));
    expect(getPublicCollectionPage).toHaveBeenCalledWith(1, settings.looksPageSize);
    expect(screen.getByRole('heading', { level: 1, name: 'Bộ sưu tập' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Streetwear' })).toHaveAttribute('href', '/collections/streetwear');
  });

  it('uses the configured label', async () => {
    getPublicSettings.mockResolvedValue({ ...settings, collectionsLabel: 'Phong cách' });
    render(await CollectionsPage(search()));
    expect(screen.getByRole('heading', { level: 1, name: 'Phong cách' })).toBeInTheDocument();
  });

  it('paginates with /collections?page=n links', async () => {
    getPublicCollectionPage.mockResolvedValue(list(5, 2));
    render(await CollectionsPage(search('2')));
    expect(getPublicCollectionPage).toHaveBeenCalledWith(2, settings.looksPageSize);
    expect(screen.getByRole('link', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/collections?page=3');
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/collections');
  });

  it.each(['abc', '0', '-3'])('treats page=%j as page 1', async (raw) => {
    render(await CollectionsPage(search(raw)));
    expect(getPublicCollectionPage).toHaveBeenCalledWith(1, settings.looksPageSize);
  });

  it('calls notFound() beyond the last page', async () => {
    getPublicCollectionPage.mockResolvedValue({ items: [], total: 5, page: 999, size: 2 });
    await expect(CollectionsPage(search('999'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows the empty message instead of a 404 when nothing is published', async () => {
    getPublicCollectionPage.mockResolvedValue({ items: [], total: 0, page: 1, size: 2 });
    render(await CollectionsPage(search('4')));
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Chưa có bộ sưu tập nào' })).toBeInTheDocument();
  });

  it('builds canonical /collections for page 1 and ?page=n otherwise', async () => {
    expect((await generateMetadata(search())).alternates?.canonical).toBe('https://shop.example.test/collections');
    const second = await generateMetadata(search('2'));
    expect(second.alternates?.canonical).toBe('https://shop.example.test/collections?page=2');
  });
});
