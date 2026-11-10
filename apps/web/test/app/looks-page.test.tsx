import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LooksPage, { generateMetadata } from '@/app/(public)/looks/page';

const { getOutfitFeedPage, getPublicSettings, notFound } = vi.hoisted(() => ({
  getOutfitFeedPage: vi.fn(),
  getPublicSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));
vi.mock('@/lib/seo/public-feed-loaders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getOutfitFeedPage,
}));
// The real feed has an async footer and client islands; the page only has to hand it the right props.
vi.mock('@/components/feed/outfit-feed', () => ({
  OutfitFeed: (props: { outfits: { slug: string }[]; nextPage: number | null; basePath: string }) => (
    <div data-testid="feed" data-next={String(props.nextPage)} data-base={props.basePath}>
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
const search = (page?: string | string[]) => ({ searchParams: Promise.resolve(page === undefined ? {} : { page }) });

beforeEach(() => {
  getOutfitFeedPage.mockReset().mockResolvedValue({ items: [{ slug: 'a' }, { slug: 'b' }], total: 5, page: 1, size: 2 });
  getPublicSettings.mockReset().mockResolvedValue(settings);
  notFound.mockClear();
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

describe('/looks', () => {
  it('asks for batch 1 with the configured size and hands the feed a hidden h1', async () => {
    render(await LooksPage(search()));
    expect(getOutfitFeedPage).toHaveBeenCalledWith(1, settings.looksPageSize);
    expect(screen.getByRole('heading', { level: 1, name: 'Tất cả outfit' })).toBeInTheDocument();
    const feed = screen.getByTestId('feed');
    expect(feed).toHaveTextContent('a,b');
    expect(feed).toHaveAttribute('data-next', '2');
    expect(feed).toHaveAttribute('data-base', '/looks');
  });

  it('starts at the requested batch and has no next batch after the last', async () => {
    getOutfitFeedPage.mockResolvedValue({ items: [{ slug: 'e' }], total: 5, page: 3, size: 2 });
    render(await LooksPage(search('3')));
    expect(getOutfitFeedPage).toHaveBeenCalledWith(3, settings.looksPageSize);
    expect(screen.getByTestId('feed')).toHaveAttribute('data-next', 'null');
  });

  it.each(['abc', '0', '-3', '1.5', ''])('treats page=%j as page 1', async (raw) => {
    render(await LooksPage(search(raw)));
    expect(getOutfitFeedPage).toHaveBeenCalledWith(1, settings.looksPageSize);
  });

  it('calls notFound() when the page is beyond the last one', async () => {
    getOutfitFeedPage.mockResolvedValue({ items: [], total: 5, page: 999, size: 2 });
    await expect(LooksPage(search('999'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows the empty message instead of a 404 when there are no outfits at all', async () => {
    getOutfitFeedPage.mockResolvedValue({ items: [], total: 0, page: 1, size: 2 });
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
