import { render } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import LookPage, { generateMetadata } from '@/app/(public)/look/[slug]/page';

const { getOutfitBySlug, getPublicSettings, notFound } = vi.hoisted(() => ({
  getOutfitBySlug: vi.fn(),
  getPublicSettings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/public/related-outfits-section', () => ({
  RelatedOutfitsSection: ({ count, excludeSlug }: { count: number; excludeSlug?: string }) => (
    <div data-testid="related" data-count={count} data-exclude={excludeSlug} />
  ),
}));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getOutfitBySlug, getPublicSettings }));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 12,
  relatedOutfitsCount: 8,
};
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

beforeEach(() => {
  getOutfitBySlug.mockReset();
  getPublicSettings.mockReset().mockResolvedValue(settings);
  notFound.mockClear();
});

describe('/look/[slug]', () => {
  it('calls notFound() when the API has no outfit for the slug', async () => {
    getOutfitBySlug.mockResolvedValue(null);
    await expect(LookPage(params('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(getOutfitBySlug).toHaveBeenCalledWith('missing');
  });

  it('calls notFound() from generateMetadata too, so no metadata is built for a missing outfit', async () => {
    getOutfitBySlug.mockResolvedValue(null);
    await expect(generateMetadata(params('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders exactly one h1 and the JSON-LD script for an existing outfit', async () => {
    getOutfitBySlug.mockResolvedValue(samplePublicOutfit);
    const { container } = render(await LookPage(params(samplePublicOutfit.slug)));

    const headings = container.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(samplePublicOutfit.title);

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    const jsonLd = JSON.parse(scripts[0]!.textContent ?? '');
    expect(JSON.stringify(jsonLd)).toContain(samplePublicOutfit.title);
  });

  it('renders a breadcrumb ending in the title and passes the current slug to the related section', async () => {
    getOutfitBySlug.mockResolvedValue(samplePublicOutfit);
    const { container } = render(await LookPage(params(samplePublicOutfit.slug)));

    const crumb = container.querySelector('nav[aria-label="Đường dẫn trang"]');
    expect(crumb).not.toBeNull();
    expect(crumb?.querySelectorAll('a')).toHaveLength(2);
    expect(crumb?.querySelector('[aria-current="page"]')).toHaveTextContent(samplePublicOutfit.title);
    expect(container.querySelectorAll('main')).toHaveLength(0);

    const related = container.querySelector('[data-testid="related"]');
    expect(related).toHaveAttribute('data-count', String(settings.relatedOutfitsCount));
    expect(related).toHaveAttribute('data-exclude', samplePublicOutfit.slug);
  });
});
