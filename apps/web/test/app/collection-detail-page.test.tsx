import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleCollectionCards } from '@under30ss/shared/fixtures';
import CollectionPage, { generateMetadata } from '@/app/(public)/collections/[slug]/page';

const { getCollectionPage, getPublicSettings, notFound } = vi.hoisted(() => ({
  getCollectionPage: vi.fn(),
  getPublicSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/seo/public-collection-loaders', () => ({ getCollectionPage }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 2,
  relatedOutfitsCount: 8,
};
const outfit = (slug: string) => ({
  slug,
  title: `Title ${slug}`,
  modelImage: { key: `k-${slug}`, url: `/media/${slug}.webp`, width: 400, height: 1000 },
  updatedAt: '2026-11-01T00:00:00.000Z',
});
const data = (total: number, page = 1) => ({
  collection: { ...sampleCollectionCards[0]!, description: 'Dòng một\nDòng hai', seoDescription: 'Seo' },
  outfits: { items: total === 0 ? [] : [outfit('a'), outfit('b')], total, page, size: 2 },
});
const props = (page?: string, slug = 'streetwear') => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve(page === undefined ? {} : { page }),
});

beforeEach(() => {
  getCollectionPage.mockReset().mockResolvedValue(data(5));
  getPublicSettings.mockReset().mockResolvedValue(settings);
  notFound.mockClear();
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

describe('/collections/[slug]', () => {
  it('renders breadcrumb, header with split description, outfit cards and pagination', async () => {
    render(await CollectionPage(props()));
    expect(getCollectionPage).toHaveBeenCalledWith('streetwear', 1, settings.looksPageSize);
    expect(screen.getByRole('heading', { level: 1, name: 'Streetwear' })).toBeInTheDocument();
    expect(screen.getByText('Dòng một')).toBeInTheDocument();
    expect(screen.getByText('Dòng hai')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Title a' })).toHaveAttribute('href', '/look/a');
    expect(screen.getByRole('navigation', { name: 'Đường dẫn trang' })).toHaveTextContent('Trang chủ');
    expect(screen.getByRole('link', { name: 'Bộ sưu tập' })).toHaveAttribute('href', '/collections');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/collections/streetwear?page=2');
  });

  it('loads the cover eagerly with high priority', async () => {
    const { container } = render(await CollectionPage(props()));
    const cover = container.querySelector('header img')!;
    expect(cover.getAttribute('loading')).toBe('eager');
    expect(cover.getAttribute('fetchpriority')).toBe('high');
  });

  it('calls notFound() for an unknown or draft slug', async () => {
    getCollectionPage.mockResolvedValue(null);
    await expect(CollectionPage(props(undefined, 'nope'))).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(generateMetadata(props(undefined, 'nope'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('calls notFound() when the page is beyond the last one', async () => {
    getCollectionPage.mockResolvedValue(data(5, 999));
    await expect(CollectionPage(props('999'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows an empty message inside the page for a collection without outfits', async () => {
    getCollectionPage.mockResolvedValue(data(0));
    render(await CollectionPage(props()));
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByText('Bộ sưu tập này chưa có outfit nào.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('builds metadata from the collection', async () => {
    const metadata = await generateMetadata(props('2'));
    expect(metadata.title).toBe('Streetwear - Trang 2 | Shop');
    expect(metadata.description).toBe('Seo');
    expect(metadata.alternates?.canonical).toBe('https://shop.example.test/collections/streetwear?page=2');
  });
});
