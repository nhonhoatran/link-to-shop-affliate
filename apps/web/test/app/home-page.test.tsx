import { render } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/(public)/page';

const { getFeaturedOutfit, getPublicSettings } = vi.hoisted(() => ({
  getFeaturedOutfit: vi.fn(),
  getPublicSettings: vi.fn(),
}));

vi.mock('@/components/public/related-outfits-section', () => ({
  RelatedOutfitsSection: ({ count, excludeSlug }: { count: number; excludeSlug?: string }) => (
    <div data-testid="related" data-count={count} data-exclude={excludeSlug ?? ''} />
  ),
}));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getFeaturedOutfit, getPublicSettings }));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 12,
  relatedOutfitsCount: 5,
};

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

beforeEach(() => {
  getFeaturedOutfit.mockReset();
  getPublicSettings.mockReset().mockResolvedValue(settings);
});

describe('/', () => {
  it('renders the featured lookbook with the related section that excludes it', async () => {
    getFeaturedOutfit.mockResolvedValue(samplePublicOutfit);
    const { container } = render(await HomePage());
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('[data-lookbook]')).not.toBeNull();
    const related = container.querySelector('[data-testid="related"]');
    expect(related).toHaveAttribute('data-count', '5');
    expect(related).toHaveAttribute('data-exclude', samplePublicOutfit.slug);
  });

  it('keeps the empty message and still offers the outfit list when nothing is featured', async () => {
    getFeaturedOutfit.mockResolvedValue(null);
    const { container } = render(await HomePage());
    expect(container.querySelector('[data-lookbook]')).toBeNull();
    expect(container.querySelector('h1')).toHaveTextContent('Chưa có outfit nào');
    expect(container.querySelector('[data-testid="related"]')).toHaveAttribute('data-exclude', '');
  });
});
