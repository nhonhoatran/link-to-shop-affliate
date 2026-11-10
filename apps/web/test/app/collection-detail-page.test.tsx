import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleCollectionCards } from '@under30ss/shared/fixtures';
import CollectionPage, { generateMetadata } from '@/app/(public)/collections/[slug]/page';

const { getCollectionPage, getOutfitFeedPage, getPublicSettings, notFound } = vi.hoisted(() => ({
  getCollectionPage: vi.fn(),
  getOutfitFeedPage: vi.fn(),
  getPublicSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/seo/public-collection-loaders', () => ({ getCollectionPage }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));
vi.mock('@/lib/seo/public-feed-loaders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getOutfitFeedPage,
}));
// The real feed has an async footer and client islands; the page only has to hand it the right props.
vi.mock('@/components/feed/outfit-feed', () => ({
  OutfitFeed: (props: { outfits: { slug: string }[]; nextPage: number | null; basePath: string; collection?: string }) => (
    <div data-testid="feed" data-next={String(props.nextPage)} data-base={props.basePath} data-collection={props.collection}>
      {props.outfits.map((o) => o.slug).join(',')}
    </div>
  ),
}));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 2,
  relatedOutfitsCount: 8,
};
const collectionData = () => ({
  collection: { ...sampleCollectionCards[0]!, description: 'Dòng một\nDòng hai', seoDescription: 'Seo' },
  outfits: { items: [], total: 5, page: 1, size: 2 },
});
const feedData = (total: number, page = 1) => ({
  items: total === 0 ? [] : [{ slug: 'a' }, { slug: 'b' }],
  total,
  page,
  size: 2,
});
const props = (page?: string, slug = 'streetwear') => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve(page === undefined ? {} : { page }),
});

beforeEach(() => {
  getCollectionPage.mockReset().mockResolvedValue(collectionData());
  getOutfitFeedPage.mockReset().mockResolvedValue(feedData(5));
  getPublicSettings.mockReset().mockResolvedValue(settings);
  notFound.mockClear();
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

describe('/collections/[slug]', () => {
  it('renders only a hidden title and the feed filtered by the collection', async () => {
    const { container } = render(await CollectionPage(props()));
    expect(getOutfitFeedPage).toHaveBeenCalledWith(1, settings.looksPageSize, 'streetwear');
    expect(screen.getByRole('heading', { level: 1, name: 'Streetwear' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Đường dẫn trang' })).toBeNull();
    expect(screen.queryByText('Dòng một')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    const feed = screen.getByTestId('feed');
    expect(feed).toHaveTextContent('a,b');
    expect(feed).toHaveAttribute('data-next', '2');
    expect(feed).toHaveAttribute('data-base', '/collections/streetwear');
    expect(feed).toHaveAttribute('data-collection', 'streetwear');
  });

  it('calls notFound() for an unknown or draft slug', async () => {
    getCollectionPage.mockResolvedValue(null);
    getOutfitFeedPage.mockResolvedValue(null);
    await expect(CollectionPage(props(undefined, 'nope'))).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(generateMetadata(props(undefined, 'nope'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('calls notFound() when the page is beyond the last one', async () => {
    getOutfitFeedPage.mockResolvedValue(feedData(5, 999));
    await expect(CollectionPage(props('999'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows an empty message inside the page for a collection without outfits', async () => {
    getOutfitFeedPage.mockResolvedValue(feedData(0));
    render(await CollectionPage(props()));
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByText('Bộ sưu tập này chưa có outfit nào.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByTestId('feed')).toBeNull();
  });

  it('builds metadata from the collection', async () => {
    const metadata = await generateMetadata(props('2'));
    expect(metadata.title).toBe('Streetwear - Trang 2 | Shop');
    expect(metadata.description).toBe('Seo');
    expect(metadata.alternates?.canonical).toBe('https://shop.example.test/collections/streetwear?page=2');
  });
});
